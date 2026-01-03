import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CloseCashRegisterDto {
  @ApiPropertyOptional({ description: 'Observaciones al cerrar la caja' })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  closing_notes?: string;
}
