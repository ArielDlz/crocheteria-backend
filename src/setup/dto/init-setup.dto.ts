import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class InitSetupDto {
  @ApiProperty({
    example: 'admin@crocheteria.com',
    description: 'Email del super administrador',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @ApiProperty({
    example: 'SuperAdmin123!',
    description: 'Contraseña del super administrador (mínimo 6 caracteres)',
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}

