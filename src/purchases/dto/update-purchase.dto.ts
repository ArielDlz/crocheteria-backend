import { IsOptional, IsNumber, IsMongoId, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePurchaseDto {
  @ApiPropertyOptional({ description: 'ID del producto', example: '69364239f2adb4033346dd10' })
  @IsOptional()
  @IsMongoId({ message: 'ID de producto inválido' })
  product?: string;

  @ApiPropertyOptional({ description: 'Precio de compra unitario', example: 25 })
  @IsOptional()
  @IsNumber({}, { message: 'El precio de compra debe ser un número' })
  @Min(0, { message: 'El precio de compra no puede ser negativo' })
  purchase_price?: number;

  @ApiPropertyOptional({ description: 'Cantidad comprada', example: 12 })
  @IsOptional()
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity?: number;

  @ApiPropertyOptional({ description: 'Costo total de la compra', example: 300 })
  @IsOptional()
  @IsNumber({}, { message: 'El costo total debe ser un número' })
  @Min(0, { message: 'El costo total no puede ser negativo' })
  total_cost?: number;

  @ApiPropertyOptional({ 
    description: 'Indica si es una compra de emprendimiento (startup)', 
    example: false 
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo startup debe ser un valor booleano' })
  startup?: boolean;
}

