import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SetupService } from './setup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { InitSetupDto } from './dto/init-setup.dto';

@ApiTags('setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  @ApiOperation({ summary: 'Verificar si el sistema ya fue inicializado' })
  @ApiResponse({ status: 200, description: 'Estado de inicialización' })
  async getStatus() {
    const status = await this.setupService.getSetupStatus();
    return status;
  }

  @Post('init')
  @ApiOperation({ summary: 'Inicializar permisos, roles y crear super admin' })
  @ApiResponse({
    status: 201,
    description: 'Sistema inicializado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'El sistema ya fue inicializado' })
  async initialize(@Body() initSetupDto: InitSetupDto) {
    return this.setupService.initializeSystem(initSetupDto);
  }

  @Post('seed-permissions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('permissions:manage')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Re-sincronizar permisos por defecto (solo agrega nuevos)',
  })
  @ApiResponse({ status: 200, description: 'Permisos sincronizados' })
  async seedPermissions() {
    return this.setupService.seedPermissions();
  }

  @Post('seed-roles')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('roles:create')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Re-sincronizar roles por defecto (solo agrega nuevos)',
  })
  @ApiResponse({ status: 200, description: 'Roles sincronizados' })
  async seedRoles() {
    return this.setupService.seedRoles();
  }
}
