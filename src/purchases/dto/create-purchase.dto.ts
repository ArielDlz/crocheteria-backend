import {
  IsNotEmpty,
  IsNumber,
  IsMongoId,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePurchaseDto {
  @ApiProperty({
    description: 'ID del producto',
    example: '69364239f2adb4033346dd10',
  })
  @IsNotEmpty({ message: 'El producto es requerido' })
  @IsMongoId({ message: 'ID de producto inválido' })
  product: string;

  @ApiProperty({ description: 'Precio de compra unitario', example: 25 })
  @IsNotEmpty({ message: 'El precio de compra es requerido' })
  @IsNumber({}, { message: 'El precio de compra debe ser un número' })
  @Min(0, { message: 'El precio de compra no puede ser negativo' })
  purchase_price: number;

  @ApiProperty({ description: 'Cantidad comprada', example: 12 })
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  @ApiProperty({ description: 'Costo total de la compra', example: 300 })
  @IsNotEmpty({ message: 'El costo total es requerido' })
  @IsNumber({}, { message: 'El costo total debe ser un número' })
  @Min(0, { message: 'El costo total no puede ser negativo' })
  total_cost: number;

  @ApiProperty({
    description: 'Indica si es una compra de emprendimiento (startup)',
    example: false,
  })
  @IsNotEmpty({ message: 'El campo startup es requerido' })
  @IsBoolean({ message: 'El campo startup debe ser un valor booleano' })
  startup: boolean;
}
