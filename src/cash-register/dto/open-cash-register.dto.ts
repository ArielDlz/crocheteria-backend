import {
  IsNotEmpty,
  IsNumber,
  IsMongoId,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenCashRegisterDto {
  @ApiProperty({ description: 'Fondo inicial para la caja', example: 500 })
  @IsNotEmpty({ message: 'El fondo inicial es requerido' })
  @IsNumber({}, { message: 'El fondo inicial debe ser un número' })
  @Min(0, { message: 'El fondo inicial no puede ser negativo' })
  initial_balance: number;

  @ApiProperty({
    description: 'ID del usuario que abre la caja',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'El usuario es requerido' })
  @IsMongoId({ message: 'ID de usuario inválido' })
  opened_by: string;

  @ApiPropertyOptional({ description: 'Observaciones al abrir la caja' })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  opening_notes?: string;
}
