import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../products/schemas/products.schema';

export type PurchaseDocument = Purchase & Document;

@Schema({ timestamps: true })
export class Purchase {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId | Product;

  @Prop({ required: true })
  purchase_price: number;

  @Prop({ required: true })
  quantity: number;

  @ApiProperty({
    example: 12,
    description:
      'Cantidad disponible de esta compra (inicialmente igual a quantity)',
  })
  @Prop({ required: true })
  available: number;

  @Prop({ required: true })
  total_cost: number;

  @ApiProperty({
    example: false,
    description: 'Indica si es una compra de emprendimiento (startup)',
  })
  @Prop({ required: true, default: false })
  startup: boolean;

  @Prop({ default: true })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PurchaseSchema = SchemaFactory.createForClass(Purchase);
