import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection, ClientSession } from 'mongoose';
import {
  CashRegister,
  CashRegisterDocument,
} from './schemas/cash-register.schema';
import { CashCut, CashCutDocument } from './schemas/cash-cut.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Payment,
  PaymentDocument,
} from '../payments/schemas/payment.schema';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { CreateCashCutDto } from './dto/create-cash-cut.dto';

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectModel(CashRegister.name)
    private cashRegisterModel: Model<CashRegisterDocument>,
    @InjectModel(CashCut.name) private cashCutModel: Model<CashCutDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  /**
   * Abre una nueva caja (solo si no hay una abierta)
   */
  async openCashRegister(
    openDto: OpenCashRegisterDto,
  ): Promise<CashRegisterDocument> {
    // Verificar que no haya una caja abierta
    const openRegister = await this.cashRegisterModel
      .findOne({ status: 'open' })
      .exec();
    if (openRegister) {
      throw new ConflictException(
        'Ya existe una caja abierta. Debe cerrarla antes de abrir una nueva.',
      );
    }

    // Verificar que el usuario existe
    const user = await this.userModel.findById(openDto.opened_by).exec();
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Crear nueva caja
    const cashRegister = new this.cashRegisterModel({
      status: 'open',
      initial_balance: openDto.initial_balance,
      current_balance: openDto.initial_balance,
      opened_by: new Types.ObjectId(openDto.opened_by),
      opened_at: new Date(),
      opening_notes: openDto.opening_notes,
    });

    return this.cashRegisterModel
      .findById((await cashRegister.save())._id)
      .populate('opened_by', 'email name family_name')
      .exec() as Promise<CashRegisterDocument>;
  }

  /**
   * Obtiene el estado de la caja (información ligera para el frontend)
   */
  async getCashRegisterStatus(): Promise<{
    isOpen: boolean;
    cashRegisterId?: string;
    currentBalance?: number;
    initialBalance?: number;
    openedAt?: Date;
  }> {
    const cashRegister = await this.cashRegisterModel
      .findOne({ status: 'open' })
      .select('_id current_balance initial_balance opened_at')
      .sort({ opened_at: -1 })
      .lean()
      .exec();

    if (!cashRegister) {
      return { isOpen: false };
    }

    return {
      isOpen: true,
      cashRegisterId: cashRegister._id.toString(),
      currentBalance: cashRegister.current_balance,
      initialBalance: cashRegister.initial_balance,
      openedAt: cashRegister.opened_at,
    };
  }

  /**
   * Obtiene la caja actual abierta
   */
  async getCurrentCashRegister(): Promise<CashRegisterDocument | null> {
    return this.cashRegisterModel
      .findOne({ status: 'open' })
      .populate('opened_by', 'email name family_name')
      .sort({ opened_at: -1 })
      .exec();
  }

  /**
   * Obtiene todas las cajas (abiertas y cerradas)
   */
  async findAllCashRegisters(): Promise<CashRegisterDocument[]> {
    return this.cashRegisterModel
      .find()
      .populate('opened_by', 'email name family_name')
      .populate('closed_by', 'email name family_name')
      .sort({ opened_at: -1 })
      .exec();
  }

  /**
   * Obtiene una caja por ID junto con todos los pagos asociados
   */
  async findCashRegisterById(id: string): Promise<{
    cashRegister: CashRegisterDocument | null;
    payments: PaymentDocument[];
  }> {
    const cashRegister = await this.cashRegisterModel
      .findById(id)
      .populate('opened_by', 'email name family_name')
      .populate('closed_by', 'email name family_name')
      .exec();

    if (!cashRegister) {
      return { cashRegister: null, payments: [] };
    }

    // Obtener todos los pagos asociados a esta caja
    const payments = await this.paymentModel
      .find({ cash_id: new Types.ObjectId(id) })
      .populate('sale', 'total_ammount status')
      .populate('user', 'email name family_name')
      .sort({ payment_date: -1 })
      .exec();

    return { cashRegister, payments };
  }

  /**
   * Cierra la caja actual
   */
  async closeCashRegister(
    closeDto: CloseCashRegisterDto,
    closedByUserId: string,
  ): Promise<CashRegisterDocument> {
    const cashRegister = await this.cashRegisterModel
      .findOne({ status: 'open' })
      .exec();
    if (!cashRegister) {
      throw new NotFoundException('No hay una caja abierta para cerrar');
    }

    // Verificar que el usuario existe
    const user = await this.userModel.findById(closedByUserId).exec();
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    cashRegister.status = 'closed';
    cashRegister.closed_by = new Types.ObjectId(closedByUserId);
    cashRegister.closed_at = new Date();
    cashRegister.closing_notes = closeDto.closing_notes;

    return this.cashRegisterModel
      .findById((await cashRegister.save())._id)
      .populate('opened_by', 'email name family_name')
      .populate('closed_by', 'email name family_name')
      .exec() as Promise<CashRegisterDocument>;
  }

  /**
   * Realiza un corte de caja (extrae efectivo y reinicia con nuevo fondo inicial)
   * Usa transacción para asegurar consistencia
   */
  async createCashCut(cutDto: CreateCashCutDto): Promise<{
    cashCut: CashCutDocument;
    newCashRegister: CashRegisterDocument;
  }> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Verificar que la caja existe y está abierta
      const cashRegister = await this.cashRegisterModel
        .findById(cutDto.cash_register)
        .session(session)
        .exec();
      if (!cashRegister) {
        throw new NotFoundException('Caja no encontrada');
      }
      if (cashRegister.status !== 'open') {
        throw new BadRequestException(
          'Solo se puede hacer un corte en una caja abierta',
        );
      }

      // Verificar que el usuario existe
      const user = await this.userModel
        .findById(cutDto.user)
        .session(session)
        .exec();
      if (!user) {
        throw new BadRequestException('Usuario no encontrado');
      }

      const balanceBefore = cashRegister.current_balance;
      const amountExtracted = balanceBefore - cutDto.new_initial_balance;

      if (amountExtracted < 0) {
        throw new BadRequestException(
          'El fondo inicial no puede ser mayor al balance actual',
        );
      }

      // Crear registro del corte
      const cashCut = new this.cashCutModel({
        cash_register: new Types.ObjectId(cutDto.cash_register),
        amount_extracted: amountExtracted,
        balance_before: balanceBefore,
        balance_after: cutDto.new_initial_balance,
        user: new Types.ObjectId(cutDto.user),
        cut_date: new Date(),
        notes: cutDto.notes,
      });
      await cashCut.save({ session });

      // Cerrar la caja actual
      cashRegister.status = 'closed';
      cashRegister.closed_by = new Types.ObjectId(cutDto.user);
      cashRegister.closed_at = new Date();
      cashRegister.closing_notes = `Corte de caja - Extraído: ${amountExtracted}, Fondo restante: ${cutDto.new_initial_balance}`;
      await cashRegister.save({ session });

      // Abrir nueva caja con el fondo inicial
      const newCashRegister = new this.cashRegisterModel({
        status: 'open',
        initial_balance: cutDto.new_initial_balance,
        current_balance: cutDto.new_initial_balance,
        opened_by: new Types.ObjectId(cutDto.user),
        opened_at: new Date(),
        opening_notes: `Apertura después de corte - Fondo inicial: ${cutDto.new_initial_balance}`,
      });
      await newCashRegister.save({ session });

      await session.commitTransaction();

      // Retornar datos poblados
      const savedCashCut = await this.cashCutModel
        .findById(cashCut._id)
        .populate('cash_register')
        .populate('user', 'email name family_name')
        .exec();

      const savedNewCashRegister = await this.cashRegisterModel
        .findById(newCashRegister._id)
        .populate('opened_by', 'email name family_name')
        .exec();

      return {
        cashCut: savedCashCut as CashCutDocument,
        newCashRegister: savedNewCashRegister as CashRegisterDocument,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Obtiene todos los cortes de caja
   */
  async findAllCashCuts(): Promise<CashCutDocument[]> {
    return this.cashCutModel
      .find()
      .populate('cash_register')
      .populate('user', 'email name family_name')
      .sort({ cut_date: -1 })
      .exec();
  }

  /**
   * Obtiene cortes de una caja específica
   */
  async findCashCutsByRegister(
    cashRegisterId: string,
  ): Promise<CashCutDocument[]> {
    return this.cashCutModel
      .find({ cash_register: new Types.ObjectId(cashRegisterId) })
      .populate('cash_register')
      .populate('user', 'email name family_name')
      .sort({ cut_date: -1 })
      .exec();
  }

  /**
   * Incrementa el balance de la caja actual (llamado cuando se registra un pago en efectivo)
   * @param amount Monto a incrementar
   * @param session Sesión de transacción opcional para operaciones atómicas
   */
  async incrementBalance(
    amount: number,
    session?: ClientSession,
  ): Promise<void> {
    const cashRegister = await this.cashRegisterModel
      .findOne({ status: 'open' })
      .session(session || null)
      .exec();

    if (!cashRegister) {
      throw new NotFoundException('No hay una caja abierta');
    }

    cashRegister.current_balance += amount;
    await cashRegister.save({ session });
  }

  /**
   * Decrementa el balance de la caja actual (llamado cuando se elimina un pago en efectivo)
   * @param amount Monto a decrementar
   * @param session Sesión de transacción opcional para operaciones atómicas
   */
  async decrementBalance(
    amount: number,
    session?: ClientSession,
  ): Promise<void> {
    const cashRegister = await this.cashRegisterModel
      .findOne({ status: 'open' })
      .session(session || null)
      .exec();

    if (!cashRegister) {
      throw new NotFoundException('No hay una caja abierta');
    }

    cashRegister.current_balance = Math.max(
      0,
      cashRegister.current_balance - amount,
    );
    await cashRegister.save({ session });
  }
}
