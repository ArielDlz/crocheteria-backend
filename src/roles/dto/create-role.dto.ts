import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, Matches } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'vendedor', description: 'Nombre único del rol' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @Matches(/^[a-z_]+$/, { message: 'El nombre solo puede contener letras minúsculas y guiones bajos' })
  name: string;

  @ApiProperty({ example: 'Vendedor de tienda', description: 'Descripción del rol' })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida' })
  description: string;

  @ApiPropertyOptional({ 
    example: ['sales:create', 'sales:read'], 
    description: 'Lista de códigos de permisos' 
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Vendedor senior', description: 'Nueva descripción' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ 
    example: ['sales:create', 'sales:read', 'sales:update'], 
    description: 'Nueva lista de permisos' 
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}

