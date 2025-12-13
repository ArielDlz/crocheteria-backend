import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class CreateProductCategoryDto {
  @ApiProperty({ example: 'Fuller', description: 'Nombre de la categoría' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiProperty({ 
    example: 'Productos de Fuller', 
    description: 'Descripción de la categoría' 
  })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida' })
  description: string;

  @ApiProperty({ 
    example: true, 
    description: 'Si la categoría tiene comisión' 
  })
  @IsBoolean()
  @IsNotEmpty({ message: 'El campo comision es requerido' })
  comision: boolean;

  @ApiPropertyOptional({ 
    example: 'Porcentaje', 
    description: 'Tipo de comisión: Porcentaje o Monto Fijo' 
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

  @ApiProperty({ 
    example: true, 
    description: 'Si es una categoría de startup' 
  })
  @IsBoolean()
  @IsNotEmpty({ message: 'El campo startup es requerido' })
  startup: boolean;

  @ApiPropertyOptional({ 
    example: 'Fuller', 
    description: 'Nombre del startup (si aplica)' 
  })
  @IsString()
  @IsOptional()
  startup_name?: string;
}

