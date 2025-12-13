import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ProductCategoryDocument = ProductCategory & Document;

@Schema({ timestamps: true, collection: 'product_categories' })
export class ProductCategory {
  @ApiProperty({ example: 'Fuller', description: 'Nombre de la categoría' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ example: 'Productos de Fuller', description: 'Descripción de la categoría' })
  @Prop({ required: true, trim: true })
  description: string;

  @ApiProperty({ 
    example: true, 
    description: 'Si la categoría tiene comisión' 
  })
  @Prop({ required: true, default: false })
  comision: boolean;

  @ApiProperty({ 
    example: true, 
    description: 'Si es una categoría de startup' 
  })
  @Prop({ required: true, default: false })
  startup: boolean;

  @ApiProperty({ 
    example: 'Fuller', 
    description: 'Nombre del startup (si aplica)' 
  })
  @Prop({ trim: true })
  startup_name?: string;

  @ApiProperty({ 
    example: 'Porcentaje', 
    description: 'Tipo de comisión Porcentaje o Monto Fijo' 
  })
  @Prop({ trim: true })
  comision_type?: string;
  
  @ApiProperty({ 
    example: 10, 
    description: 'Monto de la comisión' 
  })
  @Prop()
  comision_ammount?: number;

  @ApiProperty({ example: true, description: 'Si la categoría está activa' })
  @Prop({ default: true })
  isActive: boolean;
  
  @ApiProperty({ description: 'Fecha de creación' })
  createdAt?: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt?: Date;
}

export const ProductCategorySchema = SchemaFactory.createForClass(ProductCategory);

// Índices
ProductCategorySchema.index({ name: 1 });
ProductCategorySchema.index({ isActive: 1 });

