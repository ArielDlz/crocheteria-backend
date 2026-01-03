import {
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsMongoId,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class SalesLineDto {
  @ApiPropertyOptional({
    description: 'ID del producto vendido',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsMongoId({ message: 'ID de producto inválido' })
  product?: string;

  @ApiPropertyOptional({
    description: 'Cantidad de productos vendidos',
    example: 2,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Precio de venta unitario',
    example: 150,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  sell_price?: number;

  @ApiPropertyOptional({
    description: 'Precio de compra unitario',
    example: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El precio de compra debe ser un número' })
  @Min(0, { message: 'El precio de compra no puede ser negativo' })
  purchase_price?: number;

  @ApiPropertyOptional({
    description: 'Total de la línea (venta)',
    example: 300,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El total de la línea debe ser un número' })
  @Min(0, { message: 'El total de la línea no puede ser negativo' })
  line_total?: number;

  @ApiPropertyOptional({
    description: 'Costo total de la línea (compra)',
    example: 200,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El costo total de la línea debe ser un número' })
  @Min(0, { message: 'El costo total de la línea no puede ser negativo' })
  line_total_cost?: number;
}

export class UpdateSaleDto {
  // Nota: user no se puede cambiar una vez creada la venta

  @ApiPropertyOptional({
    description: 'Líneas de venta',
    type: [SalesLineDto],
  })
  @IsOptional()
  @IsArray({ message: 'sales_lines debe ser un array' })
  @ValidateNested({ each: true })
  @Type(() => SalesLineDto)
  sales_lines?: SalesLineDto[];

  @ApiPropertyOptional({ description: 'Monto total de la venta', example: 300 })
  @IsOptional()
  @IsNumber({}, { message: 'El monto total debe ser un número' })
  @Min(0, { message: 'El monto total no puede ser negativo' })
  total_ammount?: number;

  @ApiPropertyOptional({
    example: 'pending',
    description: 'Estado de la venta',
    enum: ['pending', 'paid', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['pending', 'paid', 'cancelled'], {
    message: 'El estado debe ser: pending, paid o cancelled',
  })
  status?: 'pending' | 'paid' | 'cancelled';
}
