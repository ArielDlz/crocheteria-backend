import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ==================== PERMISSION AUDIT ====================

  @Get('permissions')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Obtener logs de auditoría de permisos' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Fecha ISO (ej: 2024-01-01)' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'Fecha ISO (ej: 2024-12-31)' })
  @ApiResponse({ status: 200, description: 'Lista de logs de permisos' })
  async getPermissionAudits(
    @Query('limit') limit?: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const audits = await this.auditService.getAllPermissionAudits(
      limit || 50,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
    return { audits };
  }

  @Get('permissions/user/:userId')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Obtener logs de permisos de un usuario específico' })
  @ApiResponse({ status: 200, description: 'Lista de logs del usuario' })
  async getPermissionAuditsByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    const audits = await this.auditService.getPermissionAuditByUser(userId, limit || 50);
    return { audits };
  }

  @Get('permissions/admin/:adminId')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Obtener logs de cambios realizados por un admin' })
  @ApiResponse({ status: 200, description: 'Lista de logs realizados por el admin' })
  async getPermissionAuditsByAdmin(
    @Param('adminId') adminId: string,
    @Query('limit') limit?: number,
  ) {
    const audits = await this.auditService.getPermissionAuditByAdmin(adminId, limit || 50);
    return { audits };
  }

  @Delete('permissions/:id')
  @RequirePermissions('audit:delete')
  @ApiOperation({ summary: 'Eliminar un log de auditoría de permisos' })
  @ApiResponse({ status: 200, description: 'Log eliminado' })
  async deletePermissionAudit(@Param('id') id: string) {
    const deleted = await this.auditService.deletePermissionAudit(id);
    return { 
      success: deleted,
      message: deleted ? 'Log eliminado exitosamente' : 'Log no encontrado',
    };
  }

  // ==================== LOGIN AUDIT ====================

  @Get('logins')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Obtener logs de auditoría de logins' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de logs de login' })
  async getLoginAudits(
    @Query('limit') limit?: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const audits = await this.auditService.getAllLoginAudits(
      limit || 50,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
    return { audits };
  }

  @Get('logins/user/:userId')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Obtener logs de login de un usuario' })
  @ApiResponse({ status: 200, description: 'Lista de logs de login del usuario' })
  async getLoginAuditsByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    const audits = await this.auditService.getLoginAuditByUser(userId, limit || 50);
    return { audits };
  }

  @Get('logins/email/:email')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Obtener logs de login por email' })
  @ApiResponse({ status: 200, description: 'Lista de logs de login del email' })
  async getLoginAuditsByEmail(
    @Param('email') email: string,
    @Query('limit') limit?: number,
  ) {
    const audits = await this.auditService.getLoginAuditByEmail(email, limit || 50);
    return { audits };
  }

  @Delete('logins/:id')
  @RequirePermissions('audit:delete')
  @ApiOperation({ summary: 'Eliminar un log de auditoría de login' })
  @ApiResponse({ status: 200, description: 'Log eliminado' })
  async deleteLoginAudit(@Param('id') id: string) {
    const deleted = await this.auditService.deleteLoginAudit(id);
    return {
      success: deleted,
      message: deleted ? 'Log eliminado exitosamente' : 'Log no encontrado',
    };
  }
}

