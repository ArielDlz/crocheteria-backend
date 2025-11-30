import { Injectable, BadRequestException } from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { InitSetupDto } from './dto/init-setup.dto';

@Injectable()
export class SetupService {
  constructor(
    private permissionsService: PermissionsService,
    private rolesService: RolesService,
    private usersService: UsersService,
  ) {}

  async getSetupStatus() {
    const permissions = await this.permissionsService.findAll();
    const roles = await this.rolesService.findAll();
    const superAdminRole = await this.rolesService.findSuperAdminRole();
    
    // Verificar si existe al menos un usuario con rol super_admin
    let hasSuperAdmin = false;
    if (superAdminRole) {
      const users = await this.usersService.findAll();
      hasSuperAdmin = users.some(
        user => user.role && (user.role as any)._id?.toString() === superAdminRole._id.toString()
      );
    }

    return {
      initialized: permissions.length > 0 && roles.length > 0 && hasSuperAdmin,
      permissionsCount: permissions.length,
      rolesCount: roles.length,
      hasSuperAdmin,
      message: hasSuperAdmin 
        ? 'Sistema inicializado correctamente' 
        : 'Sistema no inicializado. Ejecuta POST /api/setup/init',
    };
  }

  async initializeSystem(initSetupDto: InitSetupDto) {
    // Verificar si ya existe un super admin
    const superAdminRole = await this.rolesService.findSuperAdminRole();
    if (superAdminRole) {
      const users = await this.usersService.findAll();
      const hasSuperAdmin = users.some(
        user => user.role && (user.role as any)._id?.toString() === superAdminRole._id.toString()
      );
      
      if (hasSuperAdmin) {
        throw new BadRequestException(
          'El sistema ya fue inicializado. Ya existe un super administrador.'
        );
      }
    }

    // 1. Crear permisos por defecto
    console.log('🌱 Creando permisos por defecto...');
    await this.permissionsService.seedDefaultPermissions();

    // 2. Crear roles por defecto
    console.log('🌱 Creando roles por defecto...');
    await this.rolesService.seedDefaultRoles();

    // 3. Obtener el rol super_admin recién creado
    const newSuperAdminRole = await this.rolesService.findSuperAdminRole();
    if (!newSuperAdminRole) {
      throw new BadRequestException('Error al crear el rol super_admin');
    }

    // 4. Crear el usuario super admin
    console.log('🌱 Creando usuario super administrador...');
    const superAdmin = await this.usersService.create(
      { email: initSetupDto.email, password: initSetupDto.password },
      newSuperAdminRole._id.toString(),
    );

    // 5. Obtener permisos del super admin
    const permissions = await this.usersService.getEffectivePermissions(
      superAdmin._id.toString()
    );

    console.log('✅ Sistema inicializado correctamente');

    return {
      message: 'Sistema inicializado exitosamente',
      superAdmin: {
        id: superAdmin._id,
        email: superAdmin.email,
        role: {
          id: newSuperAdminRole._id,
          name: newSuperAdminRole.name,
          isSuperAdmin: true,
        },
      },
      permissionsCreated: (await this.permissionsService.findAll()).length,
      rolesCreated: (await this.rolesService.findAll()).length,
      permissions,
    };
  }

  async seedPermissions() {
    await this.permissionsService.seedDefaultPermissions();
    const permissions = await this.permissionsService.findAll();
    
    return {
      message: 'Permisos sincronizados exitosamente',
      count: permissions.length,
      permissions: permissions.map(p => p.code),
    };
  }

  async seedRoles() {
    await this.rolesService.seedDefaultRoles();
    const roles = await this.rolesService.findAll();
    
    return {
      message: 'Roles sincronizados exitosamente',
      count: roles.length,
      roles: roles.map(r => ({ name: r.name, isSuperAdmin: r.isSuperAdmin })),
    };
  }
}

