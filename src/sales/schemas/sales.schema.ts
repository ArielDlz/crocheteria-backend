import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type SaleDocument = Sale & Document;

// Schema embebido para las líneas de venta
@Schema({ _id: false })
export class SalesLine {
  @ApiProperty({ description: 'ID del producto vendido' })
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @ApiProperty({ description: 'Cantidad de productos vendidos', example: 2 })
  @Prop({ required: true })
  quantity: number;

  @ApiProperty({ description: 'Precio de venta unitario', example: 150 })
  @Prop({ required: true })
  sell_price: number;

  @ApiProperty({ description: 'Precio de compra unitario', example: 100 })
  @Prop({ required: true })
  purchase_price: number;

  @ApiProperty({ description: 'Total de la línea (venta)', example: 300 })
  @Prop({ required: true })
  line_total: number;

  @ApiProperty({
    description: 'Costo total de la línea (compra)',
    example: 200,
  })
  @Prop({ required: true })
  line_total_cost: number;

  @ApiProperty({
    description: 'Indica si la línea ya fue contabilizada',
    example: false,
  })
  @Prop({ required: true, default: false })
  accounted: boolean;

  @ApiPropertyOptional({
    description: 'Monto de renta asignado a esta línea (se define al contabilizar)',
    example: 50,
  })
  @Prop()
  rent_amount?: number;

  @ApiPropertyOptional({
    description: 'Comisión calculada para productos startup (se calcula al crear la venta)',
    example: 30,
  })
  @Prop()
  commission?: number;

  @ApiProperty({
    description: 'Índice de la línea en el array de sales_lines (0-based)',
    example: 0,
  })
  @Prop({ required: true })
  index: number;

  @ApiPropertyOptional({
    description: 'ID de la categoría del producto (categoría startup si existe, sino la primera categoría)',
    example: '507f1f77bcf86cd799439011',
  })
  @Prop({ type: Types.ObjectId, ref: 'ProductCategory' })
  category_id?: Types.ObjectId;
}

export const SalesLineSchema = SchemaFactory.createForClass(SalesLine);

@Schema({ timestamps: true, collection: 'sales' })
export class Sale {
  @ApiProperty({ description: 'ID del usuario que realizó la venta' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @ApiProperty({
    description: 'Líneas de venta',
    type: [SalesLine],
    example: [
      {
        product: '507f1f77bcf86cd799439012',
        quantity: 2,
        sell_price: 150,
        purchase_price: 100,
        line_total: 300,
        line_total_cost: 200,
      },
    ],
  })
  @Prop({ type: [SalesLineSchema], required: true, default: [] })
  sales_lines: SalesLine[];

  @ApiProperty({ description: 'Monto total de la venta', example: 300 })
  @Prop({ required: true })
  total_ammount: number;

  @ApiProperty({
    example: 'pending',
    description: 'Estado de la venta',
    enum: ['pending', 'paid', 'cancelled'],
  })
  @Prop({
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @ApiProperty({ example: true, description: 'Si la venta está activa' })
  @Prop({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt?: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt?: Date;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);

// Índices
SaleSchema.index({ user: 1 });
SaleSchema.index({ 'sales_lines.product': 1 });
SaleSchema.index({ isActive: 1 });
SaleSchema.index({ createdAt: -1 });
