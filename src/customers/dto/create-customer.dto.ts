import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUrl,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Ariel de la O', description: 'Nombre del cliente' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiPropertyOptional({
    example: 'crochetería',
    description: 'Origen del cliente',
  })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    example: 5579115522,
    description: 'Número de teléfono del cliente',
  })
  @IsNumber()
  @IsOptional()
  phone?: number;

  @ApiPropertyOptional({
    example: 'https://www.facebook.com/Ariel.Dlz93',
    description: 'URL del perfil del cliente',
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'El perfil debe ser una URL válida' })
  profile?: string;
}
