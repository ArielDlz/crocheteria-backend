import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { Sale, SaleDocument } from '../sales/schemas/sales.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

    // Crear el pago
    const payment = new this.paymentModel({
      sale: new Types.ObjectId(createDto.sale),
      payment_method: createDto.payment_method,
      ammount: createDto.ammount,
      payment_date: createDto.payment_date ? new Date(createDto.payment_date) : new Date(),
      user: new Types.ObjectId(createDto.user),
    });
    const savedPayment = await payment.save();

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

  async update(id: string, updateDto: UpdatePaymentDto): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    // Filtrar valores undefined y null para actualización parcial
    const filteredUpdate: any = Object.fromEntries(
      Object.entries(updateDto).filter(([_, value]) => value !== undefined && value !== null)
    );

    // Convertir payment_date si viene como string
    if (filteredUpdate.payment_date && typeof filteredUpdate.payment_date === 'string') {
      filteredUpdate.payment_date = new Date(filteredUpdate.payment_date);
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

    // Eliminar el pago
    await this.paymentModel.findByIdAndDelete(id).exec();

    // Actualizar status de la venta si es necesario
    await this.updateSaleStatusIfPaid(saleId);
  }
}

