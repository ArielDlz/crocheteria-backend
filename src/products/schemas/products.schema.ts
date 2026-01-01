import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCategory } from '../../product-categories/schemas/product-category.schema';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @ApiProperty({
    example: 'Bolsa de galletas',
    description: 'Nombre del producto como aparecerá en la tienda',
  })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({
    example: 'Bolsa de galletas con 10 piezas',
    description: 'Descripción del producto',
  })
  @Prop({ required: true, trim: true })
  description: string;

  @ApiProperty({ example: 1000, description: 'Precio de venta del producto' })
  @Prop({ required: true })
  sell_price: number;

  @ApiPropertyOptional({
    example: ['507f1f77bcf86cd799439011'],
    description: 'Array de IDs de categorías asociadas al producto',
  })
  @Prop({
    type: [{ type: Types.ObjectId, ref: 'ProductCategory' }],
    default: [],
  })
  categories: Types.ObjectId[] | ProductCategory[];

  @ApiProperty({ example: 0, description: 'Stock disponible del producto' })
  @Prop({ default: 0 })
  stock: number;

  @ApiProperty({ example: true, description: 'Si el producto está activo' })
  @Prop({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt?: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Índices
ProductSchema.index({ categories: 1 });
ProductSchema.index({ isActive: 1 });
