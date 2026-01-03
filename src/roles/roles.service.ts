import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    private permissionsService: PermissionsService,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<RoleDocument> {
    const { name, description, permissions = [] } = createRoleDto;

    const existing = await this.roleModel.findOne({ name }).exec();
    if (existing) {
      throw new ConflictException(`El rol ${name} ya existe`);
    }

    // Validar que los permisos existan
    if (permissions.length > 0) {
      const validPermissions =
        await this.permissionsService.findByCodes(permissions);
      const validCodes = validPermissions.map((p) => p.code);
      const invalidCodes = permissions.filter((p) => !validCodes.includes(p));

      if (invalidCodes.length > 0) {
        throw new BadRequestException(
          `Permisos inválidos: ${invalidCodes.join(', ')}`,
        );
      }
    }

    const role = new this.roleModel({
      name,
      description,
      permissions,
    });

    return role.save();
  }

  async findAll(): Promise<RoleDocument[]> {
    return this.roleModel.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  async findById(id: string): Promise<RoleDocument | null> {
    return this.roleModel.findById(id).exec();
  }

  async findByName(name: string): Promise<RoleDocument | null> {
    return this.roleModel.findOne({ name, isActive: true }).exec();
  }

  async findSuperAdminRole(): Promise<RoleDocument | null> {
    return this.roleModel
      .findOne({ isSuperAdmin: true, isActive: true })
      .exec();
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<RoleDocument> {
    const role = await this.roleModel.findById(id).exec();

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (role.isSystem) {
      throw new BadRequestException('No se puede modificar un rol del sistema');
    }

    // Validar permisos si se están actualizando
    if (updateRoleDto.permissions) {
      const validPermissions = await this.permissionsService.findByCodes(
        updateRoleDto.permissions,
      );
      const validCodes = validPermissions.map((p) => p.code);
      const invalidCodes = updateRoleDto.permissions.filter(
        (p) => !validCodes.includes(p),
      );

      if (invalidCodes.length > 0) {
        throw new BadRequestException(
          `Permisos inválidos: ${invalidCodes.join(', ')}`,
        );
      }
    }

    Object.assign(role, updateRoleDto);
    return role.save();
  }

  async delete(id: string): Promise<void> {
    const role = await this.roleModel.findById(id).exec();

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (role.isSystem) {
      throw new BadRequestException('No se puede eliminar un rol del sistema');
    }

    role.isActive = false;
    await role.save();
  }

  // Seed de roles por defecto
  async seedDefaultRoles(): Promise<void> {
    const defaultRoles = [
      {
        name: 'super_admin',
        description: 'Super Administrador con acceso total',
        permissions: ['*'], // Wildcard para todos los permisos
        isSuperAdmin: true,
        isSystem: true,
      },
      {
        name: 'admin',
        description: 'Administrador con permisos de gestión',
        permissions: [
          'users:read',
          'users:create',
          'users:update',
          'roles:read',
          'permissions:read',
          'permissions:manage',
          'audit:read',
          'sales:read',
          'sales:create',
          'sales:update',
          'sales:cancel',
        ],
        isSystem: true,
      },
      {
        name: 'vendedor',
        description: 'Vendedor de tienda',
        permissions: ['sales:create', 'sales:read', 'sales:update'],
        isSystem: false,
      },
      {
        name: 'viewer',
        description: 'Solo lectura',
        permissions: ['sales:read'],
        isSystem: false,
      },
    ];

    for (const roleData of defaultRoles) {
      const exists = await this.roleModel
        .findOne({ name: roleData.name })
        .exec();
      if (!exists) {
        await this.roleModel.create(roleData);
      }
    }
  }
}
