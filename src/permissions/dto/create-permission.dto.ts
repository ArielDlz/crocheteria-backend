import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'sales', description: 'Nombre del módulo' })
  @IsString()
  @IsNotEmpty({ message: 'El módulo es requerido' })
  @Matches(/^[a-z_]+$/, { message: 'El módulo solo puede contener letras minúsculas y guiones bajos' })
  module: string;

  @ApiProperty({ example: 'create', description: 'Acción del permiso' })
  @IsString()
  @IsNotEmpty({ message: 'La acción es requerida' })
  @Matches(/^[a-z_]+$/, { message: 'La acción solo puede contener letras minúsculas y guiones bajos' })
  action: string;

  @ApiProperty({ example: 'Crear ventas', description: 'Descripción del permiso' })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida' })
  description: string;
}

