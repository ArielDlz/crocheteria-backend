import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartupAccountDto {
  @ApiProperty({
    description: 'ID de la cuenta del emprendimiento',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'El ID de la cuenta startup es requerido' })
  @IsMongoId({ message: 'El ID de la cuenta startup debe ser un ObjectId válido' })
  id: string;

  @ApiProperty({
    description: 'Monto a asignar a la cuenta del emprendimiento',
    example: 35,
  })
  @IsNotEmpty({ message: 'El monto de la cuenta startup es requerido' })
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0, { message: 'El monto no puede ser negativo' })
  amount: number;
}

export class AccountsDto {
  @ApiProperty({
    description: 'Monto para la cuenta de ganancia',
    example: 50,
  })
  @IsNotEmpty({ message: 'El monto de profit es requerido' })
  @IsNumber({}, { message: 'El monto de profit debe ser un número' })
  @Min(0, { message: 'El monto de profit no puede ser negativo' })
  profit: number;

  @ApiProperty({
    description: 'Monto para la cuenta de renta',
    example: 10,
  })
  @IsNotEmpty({ message: 'El monto de rent es requerido' })
  @IsNumber({}, { message: 'El monto de rent debe ser un número' })
  @Min(0, { message: 'El monto de rent no puede ser negativo' })
  rent: number;

  @ApiProperty({
    description: 'Monto para la cuenta de inversión (solo para productos no startup)',
    example: 100,
  })
  @IsNotEmpty({ message: 'El monto de investment es requerido' })
  @IsNumber({}, { message: 'El monto de investment debe ser un número' })
  @Min(0, { message: 'El monto de investment no puede ser negativo' })
  investment: number;

  @ApiPropertyOptional({
    description: 'Información de la cuenta startup (solo para productos startup)',
    type: StartupAccountDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StartupAccountDto)
  startup?: StartupAccountDto;
}

export class AccountSaleLineDto {
  @ApiProperty({
    description: 'Montos para cada cuenta',
    type: AccountsDto,
    example: {
      profit: 50,
      rent: 10,
      investment: 100,
      startup: {
        id: '507f1f77bcf86cd799439011',
        amount: 35,
      },
    },
  })
  @IsNotEmpty({ message: 'Los montos de las cuentas son requeridos' })
  @ValidateNested()
  @Type(() => AccountsDto)
  accounts: AccountsDto;
}
