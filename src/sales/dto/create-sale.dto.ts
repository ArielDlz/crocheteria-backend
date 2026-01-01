import { IsNotEmpty, IsNumber, IsMongoId, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class SalesLineDto {
  @ApiProperty({ description: 'ID del producto vendido', example: '507f1f77bcf86cd799439012' })
  @IsNotEmpty({ message: 'El producto es requerido' })
  @IsMongoId({ message: 'ID de producto inválido' })
  product: string;

  @ApiProperty({ description: 'Cantidad de productos vendidos', example: 2 })
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  @ApiProperty({ description: 'Precio de venta unitario', example: 150 })
  @IsNotEmpty({ message: 'El precio de venta es requerido' })
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  sell_price: number;

  @ApiProperty({ description: 'Total de la línea (venta)', example: 300 })
  @IsNotEmpty({ message: 'El total de la línea es requerido' })
  @IsNumber({}, { message: 'El total de la línea debe ser un número' })
  @Min(0, { message: 'El total de la línea no puede ser negativo' })
  line_total: number;

  // Nota: purchase_price y line_total_cost se calcularán automáticamente usando FIFO
}

export class CreateSaleDto {
  @ApiProperty({ description: 'ID del usuario que realiza la venta', example: '507f1f77bcf86cd799439011' })
  @IsNotEmpty({ message: 'El usuario es requerido' })
  @IsMongoId({ message: 'ID de usuario inválido' })
  user: string;

  @ApiProperty({
    description: 'Líneas de venta',
    type: [SalesLineDto],
    example: [
      {
        product: '507f1f77bcf86cd799439012',
        quantity: 2,
        sell_price: 150,
        line_total: 300
      }
    ]
  })
  @IsNotEmpty({ message: 'Las líneas de venta son requeridas' })
  @IsArray({ message: 'sales_lines debe ser un array' })
  @ValidateNested({ each: true })
  @Type(() => SalesLineDto)
  sales_lines: SalesLineDto[];

  @ApiProperty({ description: 'Monto total de la venta', example: 300 })
  @IsNotEmpty({ message: 'El monto total es requerido' })
  @IsNumber({}, { message: 'El monto total debe ser un número' })
  @Min(0, { message: 'El monto total no puede ser negativo' })
  total_ammount: number;
}
