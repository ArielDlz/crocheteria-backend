import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Account } from './account.schema';
import { User } from '../../users/schemas/user.schema';

export type WithdrawalDocument = Withdrawal & Document;

@Schema({ timestamps: true, collection: 'withdrawals' })
export class Withdrawal {
  @ApiProperty({ description: 'ID de la cuenta de la que se retira' })
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account_id: Types.ObjectId | Account;

  @ApiProperty({ description: 'Monto retirado', example: 500 })
  @Prop({ required: true })
  amount: number;

  @ApiProperty({ description: 'ID del usuario que realizó el retiro' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId | User;

  @ApiProperty({ description: 'Descripción o motivo del retiro' })
  @Prop({ required: true, trim: true })
  description: string;

  @ApiProperty({
    description: 'Estado del retiro',
    enum: ['completed'],
    example: 'completed',
  })
  @Prop({
    type: String,
    enum: ['completed'],
    default: 'completed',
    required: true,
  })
  status: 'completed';

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt?: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt?: Date;
}

export const WithdrawalSchema = SchemaFactory.createForClass(Withdrawal);

// Índices
WithdrawalSchema.index({ account_id: 1, createdAt: -1 });
WithdrawalSchema.index({ user_id: 1 });
WithdrawalSchema.index({ createdAt: -1 });
