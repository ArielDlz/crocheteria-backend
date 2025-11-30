import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsArray, IsOptional } from 'class-validator';

export class AdminCreateUserDto {
  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'vendedor@crocheteria.com',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario (mínimo 6 caracteres)',
    example: 'Password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({
    description: 'ID del rol a asignar',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty({ message: 'El rol es requerido' })
  roleId: string;

  @ApiPropertyOptional({
    description: 'Permisos adicionales (además de los del rol)',
    example: ['sales:cancel'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  extraPermissions?: string[];

  @ApiPropertyOptional({
    description: 'Motivo de la creación (para auditoría)',
    example: 'Nuevo empleado del área de ventas',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

