import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/schemas/user.schema';

export type CashRegisterDocument = CashRegister & Document;

@Schema({ timestamps: true, collection: 'cash_registers' })
export class CashRegister {
  @ApiProperty({ description: 'Estado de la caja', enum: ['open', 'closed'] })
  @Prop({
    type: String,
    enum: ['open', 'closed'],
    default: 'open',
    required: true,
  })
  status: 'open' | 'closed';

  @ApiProperty({ description: 'Fondo inicial de la caja', example: 500 })
  @Prop({ required: true })
  initial_balance: number;

  @ApiProperty({ description: 'Balance actual de la caja', example: 1250 })
  @Prop({ required: true, default: 0 })
  current_balance: number;

  @ApiProperty({ description: 'Usuario que abrió la caja' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  opened_by: Types.ObjectId | User;

  @ApiPropertyOptional({ description: 'Usuario que cerró la caja' })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  closed_by?: Types.ObjectId | User;

  @ApiProperty({ description: 'Fecha de apertura' })
  @Prop({ required: true, default: Date.now })
  opened_at: Date;

  @ApiPropertyOptional({ description: 'Fecha de cierre' })
  @Prop()
  closed_at?: Date;

  @ApiPropertyOptional({ description: 'Observaciones al abrir' })
  @Prop()
  opening_notes?: string;

  @ApiPropertyOptional({ description: 'Observaciones al cerrar' })
  @Prop()
  closing_notes?: string;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt?: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt?: Date;
}

export const CashRegisterSchema = SchemaFactory.createForClass(CashRegister);

// Índices
CashRegisterSchema.index({ status: 1 });
CashRegisterSchema.index({ opened_by: 1 });
CashRegisterSchema.index({ opened_at: -1 });
CashRegisterSchema.index({ closed_at: -1 });
