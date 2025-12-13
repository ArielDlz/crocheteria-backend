import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional, IsArray, IsMongoId, IsBoolean } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Bolsa de galletas', description: 'Nombre del producto como aparecerá en la tienda' })
  @IsString()
  @IsOptional()
  name?: string;
  
  @ApiPropertyOptional({ example: 'Bolsa de galletas con 10 piezas', description: 'Descripción del producto' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 1000, description: 'Precio de venta del producto' })
  @IsNumber()
  @IsOptional()
  sell_price?: number;

  @ApiPropertyOptional({ 
    example: ['507f1f77bcf86cd799439011'], 
    description: 'Array de IDs de categorías a asociar al producto' 
  })
  @IsArray()
  @IsMongoId({ each: true, message: 'Cada categoría debe ser un ID válido' })
  @IsOptional()
  categories?: string[];

  @ApiPropertyOptional({ example: 0, description: 'Stock disponible del producto' })
  @IsNumber()
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ example: true, description: 'Si el producto está activo' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}