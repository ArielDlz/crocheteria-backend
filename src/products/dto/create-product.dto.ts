import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  IsMongoId,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    example: 'Bolsa de galletas',
    description: 'Nombre del producto como aparecerá en la tienda',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiProperty({
    example: 'Bolsa de galletas con 10 piezas',
    description: 'Descripción del producto',
  })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida' })
  description: string;

  @ApiProperty({ example: 1000, description: 'Precio de venta del producto' })
  @IsNumber()
  @IsNotEmpty({ message: 'El precio de venta es requerido' })
  sell_price: number;

  @ApiPropertyOptional({
    example: ['507f1f77bcf86cd799439011'],
    description: 'Array de IDs de categorías a asociar al producto',
  })
  @IsArray()
  @IsMongoId({ each: true, message: 'Cada categoría debe ser un ID válido' })
  @IsOptional()
  categories?: string[];
}
