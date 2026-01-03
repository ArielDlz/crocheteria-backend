import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Account } from './account.schema';
import { Sale } from '../../sales/schemas/sales.schema';
import { User } from '../../users/schemas/user.schema';
import { Withdrawal } from './withdrawal.schema';

export type AccountTransactionDocument = AccountTransaction & Document;

@Schema({ timestamps: true, collection: 'account_transactions' })
export class AccountTransaction {
  @ApiProperty({ description: 'ID de la cuenta asociada' })
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId | Account;

  @ApiProperty({
    description: 'Tipo de transacción',
    enum: ['credit', 'debit'],
    example: 'credit',
  })
  @Prop({
    type: String,
    enum: ['credit', 'debit'],
    required: true,
  })
  transaction_type: 'credit' | 'debit';

  @ApiProperty({ description: 'Monto de la transacción', example: 150 })
  @Prop({ required: true })
  amount: number;

  @ApiPropertyOptional({
    description: 'ID de la venta asociada (si aplica)',
  })
  @Prop({ type: Types.ObjectId, ref: 'Sale' })
  sale_id?: Types.ObjectId | Sale;

  @ApiPropertyOptional({
    description: 'ID del retiro asociado (si aplica)',
  })
  @Prop({ type: Types.ObjectId, ref: 'Withdrawal' })
  withdrawal_id?: Types.ObjectId | Withdrawal;

  @ApiProperty({ description: 'Descripción de la transacción' })
  @Prop({ required: true, trim: true })
  description: string;

  @ApiProperty({ description: 'ID del usuario que realizó la transacción' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId | User;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt?: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt?: Date;
}

export const AccountTransactionSchema =
  SchemaFactory.createForClass(AccountTransaction);

// Índices
AccountTransactionSchema.index({ account: 1, createdAt: -1 });
AccountTransactionSchema.index({ sale_id: 1 });
AccountTransactionSchema.index({ withdrawal_id: 1 });
AccountTransactionSchema.index({ user_id: 1 });
AccountTransactionSchema.index({ createdAt: -1 });
