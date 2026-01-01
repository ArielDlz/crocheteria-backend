import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { Sale, SaleDocument } from '../sales/schemas/sales.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CashRegisterService } from '../cash-register/cash-register.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(forwardRef(() => CashRegisterService))
    private cashRegisterService: CashRegisterService,
  ) {}

  async create(createDto: CreatePaymentDto): Promise<PaymentDocument> {
    // Verificar que la venta existe
    const sale = await this.saleModel.findById(createDto.sale).exec();
    if (!sale) {
      throw new BadRequestException('Venta no encontrada');
    }

    // Verificar que el usuario existe
    const user = await this.userModel.findById(createDto.user).exec();
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Si es pago en efectivo, obtener el ID de la caja abierta
    let cashRegisterId: Types.ObjectId | undefined;
    if (createDto.payment_method === 'cash') {
      try {
        const cashRegisterStatus =
          await this.cashRegisterService.getCashRegisterStatus();
        if (cashRegisterStatus.isOpen && cashRegisterStatus.cashRegisterId) {
          cashRegisterId = new Types.ObjectId(cashRegisterStatus.cashRegisterId);
        }
      } catch (error) {
        // Si no hay caja abierta, no es crítico, solo logueamos
        console.warn(
          'No se pudo obtener el ID de la caja abierta:',
          error.message,
        );
      }
    }

    // Crear el pago
    const payment = new this.paymentModel({
      sale: new Types.ObjectId(createDto.sale),
      payment_method: createDto.payment_method,
      ammount: createDto.ammount,
      payment_date: createDto.payment_date
        ? new Date(createDto.payment_date)
        : new Date(),
      user: new Types.ObjectId(createDto.user),
      ...(cashRegisterId && { cash_id: cashRegisterId }),
    });
    const savedPayment = await payment.save();

    // Si es pago en efectivo, incrementar el balance de la caja
    if (createDto.payment_method === 'cash') {
      try {
        await this.cashRegisterService.incrementBalance(createDto.ammount);
      } catch (error) {
        // Si no hay caja abierta, no es crítico, solo logueamos
        console.warn(
          'No se pudo actualizar el balance de la caja:',
          error.message,
        );
      }
    }

    // Actualizar el status de la venta a 'paid' si la suma de pagos >= total_ammount
    await this.updateSaleStatusIfPaid(createDto.sale);

    return this.paymentModel
      .findById(savedPayment._id)
      .populate('sale', 'total_ammount status')
      .populate('user', 'email name family_name')
      .exec() as Promise<PaymentDocument>;
  }

  /**
   * Actualiza el status de la venta a 'paid' si la suma de pagos >= total_ammount
   */
  private async updateSaleStatusIfPaid(saleId: string): Promise<void> {
    const sale = await this.saleModel.findById(saleId).exec();
    if (!sale) return;

    // Sumar todos los pagos activos de esta venta
    const totalPayments = await this.paymentModel
      .aggregate([
        {
          $match: {
            sale: new Types.ObjectId(saleId),
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$ammount' },
          },
        },
      ])
      .exec();

    const totalPaid = totalPayments.length > 0 ? totalPayments[0].total : 0;

    // Si el total pagado es >= al total de la venta, actualizar status a 'paid'
    if (totalPaid >= sale.total_ammount && sale.status !== 'paid') {
      sale.status = 'paid';
      await sale.save();
    }
  }

  async findAll(): Promise<PaymentDocument[]> {
    return this.paymentModel
      .find()
      .populate('sale', 'total_ammount status createdAt')
      .populate('user', 'email name family_name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findBySale(saleId: string): Promise<PaymentDocument[]> {
    return this.paymentModel
      .find({ sale: new Types.ObjectId(saleId) })
      .populate('sale', 'total_ammount status')
      .populate('user', 'email name family_name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<PaymentDocument | null> {
    return this.paymentModel
      .findById(id)
      .populate('sale', 'total_ammount status createdAt')
      .populate('user', 'email name family_name')
      .exec();
  }

  async update(
    id: string,
    updateDto: UpdatePaymentDto,
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const oldAmount = payment.ammount;
    const oldPaymentMethod = payment.payment_method;
    const newPaymentMethod = updateDto.payment_method || oldPaymentMethod;
    const newAmount =
      updateDto.ammount !== undefined ? updateDto.ammount : oldAmount;

    // Filtrar valores undefined y null para actualización parcial
    const filteredUpdate: any = Object.fromEntries(
      Object.entries(updateDto).filter(
        ([_, value]) => value !== undefined && value !== null,
      ),
    );

    // Convertir payment_date si viene como string
    if (
      filteredUpdate.payment_date &&
      typeof filteredUpdate.payment_date === 'string'
    ) {
      filteredUpdate.payment_date = new Date(filteredUpdate.payment_date);
    }

    // Ajustar balance de caja y cash_id ANTES de guardar los cambios
    const wasCashPayment = oldPaymentMethod === 'cash';
    const willBeCashPayment = newPaymentMethod === 'cash';

    if (wasCashPayment && !willBeCashPayment) {
      // Cambió de efectivo a otro método: decrementar y remover cash_id
      try {
        await this.cashRegisterService.decrementBalance(oldAmount);
      } catch (error) {
        console.warn(
          'No se pudo actualizar el balance de la caja:',
          error.message,
        );
      }
      // Remover cash_id cuando cambia a otro método de pago
      filteredUpdate.cash_id = null;
    } else if (!wasCashPayment && willBeCashPayment) {
      // Cambió de otro método a efectivo: incrementar y asignar cash_id
      try {
        await this.cashRegisterService.incrementBalance(newAmount);
        // Obtener el ID de la caja abierta
        const cashRegisterStatus =
          await this.cashRegisterService.getCashRegisterStatus();
        if (cashRegisterStatus.isOpen && cashRegisterStatus.cashRegisterId) {
          filteredUpdate.cash_id = new Types.ObjectId(
            cashRegisterStatus.cashRegisterId,
          );
        }
      } catch (error) {
        console.warn(
          'No se pudo actualizar el balance de la caja:',
          error.message,
        );
      }
    } else if (wasCashPayment && willBeCashPayment && newAmount !== oldAmount) {
      // Permanece en efectivo pero cambió el monto: ajustar diferencia
      // El cash_id permanece igual (ya está asignado)
      try {
        const difference = newAmount - oldAmount;
        if (difference > 0) {
          await this.cashRegisterService.incrementBalance(difference);
        } else {
          await this.cashRegisterService.decrementBalance(Math.abs(difference));
        }
      } catch (error) {
        console.warn(
          'No se pudo actualizar el balance de la caja:',
          error.message,
        );
      }
    }

    Object.assign(payment, filteredUpdate);
    await payment.save();

    // Actualizar status de la venta si es necesario
    await this.updateSaleStatusIfPaid(payment.sale.toString());

    return this.paymentModel
      .findById(id)
      .populate('sale', 'total_ammount status')
      .populate('user', 'email name family_name')
      .exec() as Promise<PaymentDocument>;
  }

  async deletePermanently(id: string): Promise<void> {
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const saleId = payment.sale.toString();
    const wasCashPayment = payment.payment_method === 'cash';
    const amount = payment.ammount;

    // Eliminar el pago
    await this.paymentModel.findByIdAndDelete(id).exec();

    // Si era pago en efectivo, decrementar el balance de la caja
    if (wasCashPayment) {
      try {
        await this.cashRegisterService.decrementBalance(amount);
      } catch (error) {
        console.warn(
          'No se pudo actualizar el balance de la caja:',
          error.message,
        );
      }
    }

    // Actualizar status de la venta si es necesario
    await this.updateSaleStatusIfPaid(saleId);
  }
}
