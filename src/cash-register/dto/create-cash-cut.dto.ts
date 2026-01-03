import {
  IsNotEmpty,
  IsNumber,
  IsMongoId,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCashCutDto {
  @ApiProperty({
    description: 'ID de la caja a la que se le hace el corte',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'La caja es requerida' })
  @IsMongoId({ message: 'ID de caja inválido' })
  cash_register: string;

  @ApiProperty({
    description: 'Fondo inicial para la nueva caja después del corte',
    example: 50,
  })
  @IsNotEmpty({ message: 'El fondo inicial es requerido' })
  @IsNumber({}, { message: 'El fondo inicial debe ser un número' })
  @Min(0, { message: 'El fondo inicial no puede ser negativo' })
  new_initial_balance: number;

  @ApiProperty({
    description: 'ID del usuario que realiza el corte',
    example: '507f1f77bcf86cd799439012',
  })
  @IsNotEmpty({ message: 'El usuario es requerido' })
  @IsMongoId({ message: 'ID de usuario inválido' })
  user: string;

  @ApiPropertyOptional({ description: 'Observaciones del corte' })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  notes?: string;
}
