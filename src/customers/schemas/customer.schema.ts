import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true, collection: 'customers' })
export class Customer {
  @ApiProperty({ example: 'Ariel de la O', description: 'Nombre del cliente' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiPropertyOptional({
    example: 'crochetería',
    description: 'Origen del cliente',
  })
  @Prop({ trim: true })
  from?: string;

  @ApiPropertyOptional({
    example: 5579115522,
    description: 'Número de teléfono del cliente',
  })
  @Prop({ type: Number })
  phone?: number;

  @ApiPropertyOptional({
    example: 'https://www.facebook.com/Ariel.Dlz93',
    description: 'URL del perfil del cliente',
  })
  @Prop({ trim: true })
  profile?: string;

  @ApiProperty({ example: true, description: 'Si el cliente está activo' })
  @Prop({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt?: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt?: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Índices
CustomerSchema.index({ name: 1 });
CustomerSchema.index({ isActive: 1 });
CustomerSchema.index({ phone: 1 });
