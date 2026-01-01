import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @RequirePermissions('permissions:manage')
  @ApiOperation({ summary: 'Crear un nuevo permiso' })
  @ApiResponse({ status: 201, description: 'Permiso creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El permiso ya existe' })
  async create(@Body() createPermissionDto: CreatePermissionDto) {
    const permission =
      await this.permissionsService.create(createPermissionDto);
    return {
      message: 'Permiso creado exitosamente',
      permission,
    };
  }

  @Get()
  @RequirePermissions('permissions:read')
  @ApiOperation({ summary: 'Obtener todos los permisos' })
  @ApiResponse({ status: 200, description: 'Lista de permisos' })
  async findAll() {
    const permissions = await this.permissionsService.findAll();
    return { permissions };
  }

  @Get('grouped')
  @RequirePermissions('permissions:read')
  @ApiOperation({ summary: 'Obtener permisos agrupados por módulo' })
  @ApiResponse({ status: 200, description: 'Permisos agrupados por módulo' })
  async getGrouped() {
    const grouped = await this.permissionsService.getGroupedByModule();
    return { permissions: grouped };
  }

  @Get('module/:module')
  @RequirePermissions('permissions:read')
  @ApiOperation({ summary: 'Obtener permisos de un módulo específico' })
  @ApiResponse({ status: 200, description: 'Lista de permisos del módulo' })
  async findByModule(@Param('module') module: string) {
    const permissions = await this.permissionsService.findByModule(module);
    return { permissions };
  }

  @Delete(':code')
  @RequirePermissions('permissions:manage')
  @ApiOperation({ summary: 'Desactivar un permiso' })
  @ApiResponse({ status: 200, description: 'Permiso desactivado' })
  @ApiResponse({ status: 404, description: 'Permiso no encontrado' })
  async delete(@Param('code') code: string) {
    await this.permissionsService.delete(code);
    return { message: 'Permiso desactivado exitosamente' };
  }
}
