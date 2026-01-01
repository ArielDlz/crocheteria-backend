import { IsOptional, IsNumber, IsEnum, Min, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePaymentDto {
  @ApiPropertyOptional({
    example: 'cash',
    description: 'Método de pago',
    enum: ['cash', 'transfer', 'card']
  })
  @IsOptional()
  @IsEnum(['cash', 'transfer', 'card'], {
    message: 'El método de pago debe ser: cash, transfer o card'
  })
  payment_method?: 'cash' | 'transfer' | 'card';

  @ApiPropertyOptional({ description: 'Monto del pago', example: 300 })
  @IsOptional()
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  ammount?: number;

  @ApiPropertyOptional({
    description: 'Fecha del pago (ISO string)',
    example: '2024-01-15T10:30:00.000Z'
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de pago debe ser una fecha válida' })
  payment_date?: string;
}

