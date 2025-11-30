import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { UpdateUserPermissionsDto, ChangeUserRoleDto } from './dto/update-user-permissions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuditService } from '../audit/audit.service';
import { PermissionAuditAction } from '../audit/schemas/permission-audit.schema';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @RequirePermissions('users:create')
  @ApiOperation({ summary: 'Crear un nuevo usuario (solo admin)' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya está registrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(
    @Body() dto: AdminCreateUserDto,
    @Request() req,
  ) {
    // Crear usuario con rol
    const user = await this.usersService.create(
      { email: dto.email, password: dto.password },
      dto.roleId,
    );

    // Si hay permisos extra, agregarlos
    if (dto.extraPermissions?.length) {
      await this.usersService.addExtraPermissions(
        user._id.toString(),
        dto.extraPermissions,
      );
    }

    // Registrar en auditoría
    const role = await this.usersService.findById(user._id.toString());
    const roleName = (role?.role as any)?.name || 'unknown';

    await this.auditService.logPermissionChange(
      { userId: req.user.userId, email: req.user.email },
      { userId: user._id.toString(), email: user.email },
      PermissionAuditAction.USER_CREATED,
      { 
        initialRole: roleName,
        permissionsAfter: dto.extraPermissions || [],
      },
      dto.reason,
      req.ip,
    );

    // Obtener usuario actualizado con permisos
    const updatedUser = await this.usersService.findById(user._id.toString());
    const permissions = await this.usersService.getEffectivePermissions(user._id.toString());

    return {
      message: 'Usuario creado exitosamente',
      user: {
        id: updatedUser?._id,
        email: updatedUser?.email,
        role: updatedUser?.role,
        extraPermissions: updatedUser?.extraPermissions,
        isActive: updatedUser?.isActive,
      },
      effectivePermissions: permissions,
    };
  }

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async findAll() {
    const users = await this.usersService.findAll();
    return { users };
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return { message: 'Usuario no encontrado' };
    }
    
    const permissions = await this.usersService.getEffectivePermissions(id);
    
    return { 
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        extraPermissions: user.extraPermissions,
        deniedPermissions: user.deniedPermissions,
        isActive: user.isActive,
      },
      effectivePermissions: permissions,
    };
  }

  @Get(':id/permissions')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Obtener permisos efectivos de un usuario' })
  @ApiResponse({ status: 200, description: 'Lista de permisos efectivos' })
  async getPermissions(@Param('id') id: string) {
    const permissions = await this.usersService.getEffectivePermissions(id);
    return { permissions };
  }

  @Patch(':id/role')
  @RequirePermissions('permissions:manage')
  @ApiOperation({ summary: 'Cambiar el rol de un usuario' })
  @ApiResponse({ status: 200, description: 'Rol actualizado' })
  async changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeUserRoleDto,
    @Request() req,
  ) {
    const targetUser = await this.usersService.findById(id);
    if (!targetUser) {
      return { message: 'Usuario no encontrado' };
    }

    const previousRole = (targetUser.role as any)?.name || 'sin_rol';
    const user = await this.usersService.changeRole(id, dto.roleId);
    const newRole = (user.role as any)?.name;

    // Registrar en auditoría
    await this.auditService.logPermissionChange(
      { userId: req.user.userId, email: req.user.email },
      { userId: id, email: targetUser.email },
      PermissionAuditAction.ROLE_CHANGED,
      { previousRole, newRole },
      dto.reason,
      req.ip,
    );

    const permissions = await this.usersService.getEffectivePermissions(id);

    return {
      message: 'Rol actualizado exitosamente',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      effectivePermissions: permissions,
    };
  }

  @Patch(':id/permissions')
  @RequirePermissions('permissions:manage')
  @ApiOperation({ summary: 'Modificar permisos de un usuario' })
  @ApiResponse({ status: 200, description: 'Permisos actualizados' })
  async updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateUserPermissionsDto,
    @Request() req,
  ) {
    const targetUser = await this.usersService.findById(id);
    if (!targetUser) {
      return { message: 'Usuario no encontrado' };
    }

    // Agregar permisos extra
    if (dto.addPermissions?.length) {
      await this.usersService.addExtraPermissions(id, dto.addPermissions);
      
      for (const permission of dto.addPermissions) {
        await this.auditService.logPermissionChange(
          { userId: req.user.userId, email: req.user.email },
          { userId: id, email: targetUser.email },
          PermissionAuditAction.PERMISSION_ADDED,
          { permission },
          dto.reason,
          req.ip,
        );
      }
    }

    // Quitar permisos extra
    if (dto.removePermissions?.length) {
      await this.usersService.removeExtraPermissions(id, dto.removePermissions);
      
      for (const permission of dto.removePermissions) {
        await this.auditService.logPermissionChange(
          { userId: req.user.userId, email: req.user.email },
          { userId: id, email: targetUser.email },
          PermissionAuditAction.PERMISSION_REMOVED,
          { permission },
          dto.reason,
          req.ip,
        );
      }
    }

    // Denegar permisos del rol
    if (dto.denyPermissions?.length) {
      await this.usersService.addDeniedPermissions(id, dto.denyPermissions);
      
      for (const permission of dto.denyPermissions) {
        await this.auditService.logPermissionChange(
          { userId: req.user.userId, email: req.user.email },
          { userId: id, email: targetUser.email },
          PermissionAuditAction.PERMISSION_DENIED,
          { permission },
          dto.reason,
          req.ip,
        );
      }
    }

    // Quitar denegación
    if (dto.undenyPermissions?.length) {
      await this.usersService.removeDeniedPermissions(id, dto.undenyPermissions);
      
      for (const permission of dto.undenyPermissions) {
        await this.auditService.logPermissionChange(
          { userId: req.user.userId, email: req.user.email },
          { userId: id, email: targetUser.email },
          PermissionAuditAction.PERMISSION_UNDENIED,
          { permission },
          dto.reason,
          req.ip,
        );
      }
    }

    const updatedUser = await this.usersService.findById(id);
    const permissions = await this.usersService.getEffectivePermissions(id);

    return {
      message: 'Permisos actualizados exitosamente',
      user: {
        id: updatedUser?._id,
        email: updatedUser?.email,
        extraPermissions: updatedUser?.extraPermissions,
        deniedPermissions: updatedUser?.deniedPermissions,
      },
      effectivePermissions: permissions,
    };
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  @ApiOperation({ summary: 'Desactivar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado' })
  async deactivate(
    @Param('id') id: string,
    @Request() req,
  ) {
    const targetUser = await this.usersService.findById(id);
    if (!targetUser) {
      return { message: 'Usuario no encontrado' };
    }

    await this.usersService.deactivate(id);

    // Registrar en auditoría
    await this.auditService.logPermissionChange(
      { userId: req.user.userId, email: req.user.email },
      { userId: id, email: targetUser.email },
      PermissionAuditAction.USER_DEACTIVATED,
      {},
      undefined,
      req.ip,
    );

    return { message: 'Usuario desactivado exitosamente' };
  }

  @Patch(':id/reactivate')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Reactivar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario reactivado' })
  async reactivate(
    @Param('id') id: string,
    @Request() req,
  ) {
    const targetUser = await this.usersService.findById(id);
    if (!targetUser) {
      return { message: 'Usuario no encontrado' };
    }

    await this.usersService.reactivate(id);

    // Registrar en auditoría
    await this.auditService.logPermissionChange(
      { userId: req.user.userId, email: req.user.email },
      { userId: id, email: targetUser.email },
      PermissionAuditAction.USER_REACTIVATED,
      {},
      undefined,
      req.ip,
    );

    return { message: 'Usuario reactivado exitosamente' };
  }
}

