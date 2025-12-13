import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class UpdateProductCategoryDto {
  @ApiPropertyOptional({ example: 'Fuller', description: 'Nombre de la categoría' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ 
    example: 'Productos de Fuller', 
    description: 'Descripción de la categoría' 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Si la categoría tiene comisión' 
  })
  @IsBoolean()
  @IsOptional()
  comision?: boolean;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Si es una categoría de startup' 
  })
  @IsBoolean()
  @IsOptional()
  startup?: boolean;

  @ApiPropertyOptional({ 
    example: 'Fuller', 
    description: 'Nombre del startup (si aplica)' 
  })
  @IsString()
  @IsOptional()
  startup_name?: string;

  @ApiPropertyOptional({ 
    example: 'Porcentaje', 
    description: 'Tipo de comisión Porcentaje o Monto Fijo' 
  })
  @IsString()
  @IsOptional()
  comision_type?: string;

  @ApiPropertyOptional({ 
    example: 10, 
    description: 'Monto de la comisión' 
  })
  @IsNumber()
  @IsOptional()
  comision_ammount?: number;
}

