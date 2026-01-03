import {
  IsNotEmpty,
  IsArray,
  IsMongoId,
  ValidateNested,
  IsNumber,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RentAmountDto {
  @IsString({ message: 'El ID de la línea debe ser un string' })
  line_id: string;

  @IsNumber({}, { message: 'El monto de renta debe ser un número' })
  @Min(0, { message: 'El monto de renta no puede ser negativo' })
  rent_amount: number;
}

export class AccountLinesDto {
  @ApiProperty({
    description: 'Array de índices (como strings) de las sales_lines a contabilizar',
    example: ['0', '1'],
  })
  @IsNotEmpty({ message: 'Los índices de líneas son requeridos' })
  @IsArray({ message: 'line_ids debe ser un array' })
  @IsString({ each: true, message: 'Cada índice debe ser un string numérico' })
  line_ids: string[];

  @ApiPropertyOptional({
    description: 'Montos de renta por línea de venta',
    type: [RentAmountDto],
    example: [
      { line_id: '0', rent_amount: 50 },
      { line_id: '1', rent_amount: 0 },
    ],
  })
  @IsOptional()
  @IsArray({ message: 'rent_amounts debe ser un array' })
  @ValidateNested({ each: true })
  @Type(() => RentAmountDto)
  rent_amounts?: RentAmountDto[];
}
