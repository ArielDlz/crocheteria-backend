import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional } from 'class-validator';

export class UpdateUserPermissionsDto {
  @ApiPropertyOptional({ 
    example: ['sales:cancel'], 
    description: 'Permisos a agregar' 
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  addPermissions?: string[];

  @ApiPropertyOptional({ 
    example: ['sales:read'], 
    description: 'Permisos extra a quitar' 
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  removePermissions?: string[];

  @ApiPropertyOptional({ 
    example: ['sales:delete'], 
    description: 'Permisos del rol a denegar' 
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  denyPermissions?: string[];

  @ApiPropertyOptional({ 
    example: ['sales:update'], 
    description: 'Permisos denegados a restaurar' 
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  undenyPermissions?: string[];

  @ApiPropertyOptional({ 
    example: 'Solicitud del gerente', 
    description: 'Motivo del cambio (para auditoría)' 
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class ChangeUserRoleDto {
  @ApiPropertyOptional({ 
    example: '507f1f77bcf86cd799439011', 
    description: 'ID del nuevo rol' 
  })
  @IsString()
  roleId: string;

  @ApiPropertyOptional({ 
    example: 'Promoción a supervisor', 
    description: 'Motivo del cambio (para auditoría)' 
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

