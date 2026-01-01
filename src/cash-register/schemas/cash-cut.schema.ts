import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashRegister } from './cash-register.schema';
import { User } from '../../users/schemas/user.schema';

export type CashCutDocument = CashCut & Document;

@Schema({ timestamps: true, collection: 'cash_cuts' })
export class CashCut {
  @ApiProperty({ description: 'Caja asociada al corte' })
  @Prop({ type: Types.ObjectId, ref: 'CashRegister', required: true })
  cash_register: Types.ObjectId | CashRegister;

  @ApiProperty({ description: 'Monto extraído del corte', example: 1200 })
  @Prop({ required: true })
  amount_extracted: number;

  @ApiProperty({ description: 'Balance antes del corte', example: 1250 })
  @Prop({ required: true })
  balance_before: number;

  @ApiProperty({
    description: 'Balance después del corte (fondo inicial para nueva caja)',
    example: 50,
  })
  @Prop({ required: true })
  balance_after: number;

  @ApiProperty({ description: 'Usuario que realizó el corte' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @ApiProperty({ description: 'Fecha del corte' })
  @Prop({ required: true, default: Date.now })
  cut_date: Date;

  @ApiPropertyOptional({ description: 'Observaciones del corte' })
  @Prop()
  notes?: string;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt?: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt?: Date;
}

export const CashCutSchema = SchemaFactory.createForClass(CashCut);

// Índices
CashCutSchema.index({ cash_register: 1 });
CashCutSchema.index({ user: 1 });
CashCutSchema.index({ cut_date: -1 });
CashCutSchema.index({ createdAt: -1 });
