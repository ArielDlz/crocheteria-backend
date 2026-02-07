import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsUrl } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({
    example: 'Ariel de la O',
    description: 'Nombre del cliente',
  })
  @IsString()
  @IsOptional()
  name?: string;

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
