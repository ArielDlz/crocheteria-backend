import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,
  ) {}

  async create(
    createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionDocument> {
    const { module, action, description } = createPermissionDto;
    const code = `${module}:${action}`;

    const existing = await this.permissionModel.findOne({ code }).exec();
    if (existing) {
      throw new ConflictException(`El permiso ${code} ya existe`);
    }

    const permission = new this.permissionModel({
      module,
      action,
      code,
      description,
    });

    return permission.save();
  }

  async findAll(): Promise<PermissionDocument[]> {
    return this.permissionModel
      .find({ isActive: true })
      .sort({ module: 1, action: 1 })
      .exec();
  }

  async findByModule(module: string): Promise<PermissionDocument[]> {
    return this.permissionModel.find({ module, isActive: true }).exec();
  }

  async findByCode(code: string): Promise<PermissionDocument | null> {
    return this.permissionModel.findOne({ code }).exec();
  }

  async findByCodes(codes: string[]): Promise<PermissionDocument[]> {
    return this.permissionModel
      .find({ code: { $in: codes }, isActive: true })
      .exec();
  }

  async getGroupedByModule(): Promise<Record<string, PermissionDocument[]>> {
    const permissions = await this.findAll();
    return permissions.reduce(
      (acc, permission) => {
        if (!acc[permission.module]) {
          acc[permission.module] = [];
        }
        acc[permission.module].push(permission);
        return acc;
      },
      {} as Record<string, PermissionDocument[]>,
    );
  }

  async delete(code: string): Promise<void> {
    const result = await this.permissionModel
      .findOneAndUpdate({ code }, { isActive: false })
      .exec();

    if (!result) {
      throw new NotFoundException(`Permiso ${code} no encontrado`);
    }
  }

  // Seed de permisos iniciales
  async seedDefaultPermissions(): Promise<void> {
    const defaultPermissions = [
      // Módulo de ventas
      { module: 'sales', action: 'create', description: 'Crear ventas' },
      { module: 'sales', action: 'read', description: 'Ver ventas' },
      { module: 'sales', action: 'update', description: 'Editar ventas' },
      { module: 'sales', action: 'cancel', description: 'Cancelar ventas' },

      // Módulo de usuarios
      { module: 'users', action: 'read', description: 'Ver usuarios' },
      { module: 'users', action: 'create', description: 'Crear usuarios' },
      { module: 'users', action: 'update', description: 'Editar usuarios' },
      { module: 'users', action: 'delete', description: 'Eliminar usuarios' },

      // Módulo de permisos
      { module: 'permissions', action: 'read', description: 'Ver permisos' },
      {
        module: 'permissions',
        action: 'manage',
        description: 'Gestionar permisos de usuarios',
      },

      // Módulo de roles
      { module: 'roles', action: 'read', description: 'Ver roles' },
      { module: 'roles', action: 'create', description: 'Crear roles' },
      { module: 'roles', action: 'update', description: 'Editar roles' },
      { module: 'roles', action: 'delete', description: 'Eliminar roles' },

      // Módulo de auditoría
      { module: 'audit', action: 'read', description: 'Ver logs de auditoría' },
      {
        module: 'audit',
        action: 'delete',
        description: 'Eliminar logs de auditoría',
      },

      // Módulo de categorías de productos
      {
        module: 'product_categories',
        action: 'read',
        description: 'Ver categorías de productos',
      },
      {
        module: 'product_categories',
        action: 'create',
        description: 'Crear categorías de productos',
      },
      {
        module: 'product_categories',
        action: 'update',
        description: 'Editar categorías de productos',
      },
      {
        module: 'product_categories',
        action: 'delete',
        description: 'Eliminar categorías de productos',
      },

      // Módulo de productos
      { module: 'products', action: 'read', description: 'Ver productos' },
      { module: 'products', action: 'create', description: 'Crear productos' },
      { module: 'products', action: 'update', description: 'Editar productos' },
      {
        module: 'products',
        action: 'delete',
        description: 'Eliminar productos',
      },

      // Módulo de compras
      { module: 'purchases', action: 'read', description: 'Ver compras' },
      {
        module: 'purchases',
        action: 'create',
        description: 'Registrar compras',
      },
      { module: 'purchases', action: 'update', description: 'Editar compras' },
      {
        module: 'purchases',
        action: 'delete',
        description: 'Eliminar compras',
      },

      // Módulo de ventas
      { module: 'sales', action: 'read', description: 'Ver ventas' },
      { module: 'sales', action: 'create', description: 'Registrar ventas' },
      { module: 'sales', action: 'update', description: 'Editar ventas' },
      { module: 'sales', action: 'delete', description: 'Eliminar ventas' },

      // Módulo de pagos
      { module: 'payments', action: 'read', description: 'Ver pagos' },
      { module: 'payments', action: 'create', description: 'Registrar pagos' },
      { module: 'payments', action: 'update', description: 'Editar pagos' },
      { module: 'payments', action: 'delete', description: 'Eliminar pagos' },

      // Módulo de caja
      {
        module: 'cash_register',
        action: 'read',
        description: 'Ver información de caja',
      },
      {
        module: 'cash_register',
        action: 'create',
        description: 'Abrir caja y realizar cortes',
      },
      { module: 'cash_register', action: 'update', description: 'Cerrar caja' },
            {
              module: 'cash_register',
              action: 'delete',
              description: 'Eliminar registros de caja',
            },
            // Módulo de apartados
            {
              module: 'accounts',
              action: 'read',
              description: 'Ver información de apartados',
            },
            {
              module: 'accounts',
              action: 'create',
              description: 'Crear cuentas y contabilizar líneas',
            },
            {
              module: 'accounts',
              action: 'update',
              description: 'Actualizar cuentas y realizar retiros',
            },
            {
              module: 'accounts',
              action: 'delete',
              description: 'Eliminar registros de apartados',
            },
          ];

    for (const perm of defaultPermissions) {
      const code = `${perm.module}:${perm.action}`;
      const exists = await this.permissionModel.findOne({ code }).exec();
      if (!exists) {
        await this.permissionModel.create({ ...perm, code });
      }
    }
  }
}
