import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sale } from '../../sales/schemas/sales.schema';
import { User } from '../../users/schemas/user.schema';
import { CashRegister } from '../../cash-register/schemas/cash-register.schema';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @ApiProperty({ description: 'ID de la venta asociada' })
  @Prop({ type: Types.ObjectId, ref: 'Sale', required: true })
  sale: Types.ObjectId | Sale;

  @ApiProperty({
    example: 'cash',
    description: 'Método de pago',
    enum: ['cash', 'transfer', 'card'],
  })
  @Prop({
    type: String,
    enum: ['cash', 'transfer', 'card'],
    required: true,
  })
  payment_method: string;

  @ApiProperty({ description: 'Monto del pago', example: 300 })
  @Prop({ required: true })
  ammount: number;

  @ApiProperty({ description: 'Fecha del pago' })
  @Prop({ required: true, default: Date.now })
  payment_date: Date;

  @ApiProperty({ description: 'ID del usuario que registra el pago' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @ApiPropertyOptional({
    description: 'ID de la caja de efectivo asociada (solo para pagos en efectivo)',
    example: '507f1f77bcf86cd799439013',
  })
  @Prop({ type: Types.ObjectId, ref: 'CashRegister' })
  cash_id?: Types.ObjectId | CashRegister;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt?: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Índices
PaymentSchema.index({ sale: 1 });
PaymentSchema.index({ payment_method: 1 });
PaymentSchema.index({ payment_date: 1 });
PaymentSchema.index({ user: 1 });
PaymentSchema.index({ cash_id: 1 });
PaymentSchema.index({ createdAt: -1 });
