import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type AccountDocument = Account & Document;

@Schema({ timestamps: true, collection: 'accounts' })
export class Account {
  @ApiProperty({
    description: 'Identificador único de la cuenta',
    example: 'investment',
  })
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @ApiProperty({
    description: 'Nombre para mostrar',
    example: 'Inversión',
  })
  @Prop({ required: true, trim: true })
  label: string;

  @ApiPropertyOptional({
    description: 'Metadatos adicionales (product_category_id para emprendimientos)',
  })
  @Prop({ type: Object, default: {} })
  metadata?: {
    product_category_id?: Types.ObjectId;
  };

  @ApiProperty({
    description: 'Balance actual de la cuenta (se actualiza automáticamente con las transacciones)',
    example: 1000,
  })
  @Prop({ required: true, default: 0 })
  balance: number;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt?: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt?: Date;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

// Índices
AccountSchema.index({ name: 1 }, { unique: true });
AccountSchema.index({ 'metadata.product_category_id': 1 });
