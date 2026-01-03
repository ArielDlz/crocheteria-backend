import {
  IsNotEmpty,
  IsNumber,
  IsMongoId,
  IsEnum,
  Min,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'ID de la venta asociada',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'La venta es requerida' })
  @IsMongoId({ message: 'ID de venta inválido' })
  sale: string;

  @ApiProperty({
    example: 'cash',
    description: 'Método de pago',
    enum: ['cash', 'transfer', 'card'],
  })
  @IsNotEmpty({ message: 'El método de pago es requerido' })
  @IsEnum(['cash', 'transfer', 'card'], {
    message: 'El método de pago debe ser: cash, transfer o card',
  })
  payment_method: 'cash' | 'transfer' | 'card';

  @ApiProperty({ description: 'Monto del pago', example: 300 })
  @IsNotEmpty({ message: 'El monto es requerido' })
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  ammount: number;

  @ApiProperty({
    description: 'Fecha del pago (ISO string)',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de pago debe ser una fecha válida' })
  payment_date?: string;

  @ApiProperty({
    description: 'ID del usuario que registra el pago',
    example: '507f1f77bcf86cd799439012',
  })
  @IsNotEmpty({ message: 'El usuario es requerido' })
  @IsMongoId({ message: 'ID de usuario inválido' })
  user: string;
}
