import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesService } from '../roles/roles.service';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private rolesService: RolesService,
    private permissionsService: PermissionsService,
  ) {}

  async create(createUserDto: CreateUserDto, roleId?: string): Promise<UserDocument> {
    const { email, password } = createUserDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Si no se especifica rol, asignar 'viewer' por defecto
    let role: Types.ObjectId | undefined;
    if (roleId) {
      const roleDoc = await this.rolesService.findById(roleId);
      if (!roleDoc) {
        throw new BadRequestException('Rol no encontrado');
      }
      role = roleDoc._id as Types.ObjectId;
    } else {
      const viewerRole = await this.rolesService.findByName('viewer');
      if (viewerRole) {
        role = viewerRole._id as Types.ObjectId;
      }
    }

    // Crear el usuario
    const newUser = new this.userModel({
      email,
      password: hashedPassword,
      role,
      name: createUserDto.name,
      family_name: createUserDto.familyName,
      extraPermissions: [],
      deniedPermissions: [],
    });

    return newUser.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find({ isActive: true })
      .select('-password')
      .populate('role', 'name description permissions isSuperAdmin')
      .exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email })
      .populate('role', 'name description permissions isSuperAdmin')
      .exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id)
      .populate('role', 'name description permissions isSuperAdmin')
      .exec();
  }

  async findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id)
      .populate('role', 'name description permissions isSuperAdmin')
      .exec();
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Calcular permisos efectivos del usuario
  async getEffectivePermissions(userId: string): Promise<string[]> {
    const user = await this.findById(userId);
    if (!user) return [];

    const role = user.role as any;
    
    // Si es super admin, tiene todos los permisos
    if (role?.isSuperAdmin || role?.permissions?.includes('*')) {
      const allPermissions = await this.permissionsService.findAll();
      return allPermissions.map(p => p.code);
    }

    // Permisos del rol
    const rolePermissions = role?.permissions || [];
    
    // Agregar permisos extra
    const withExtra = [...new Set([...rolePermissions, ...user.extraPermissions])];
    
    // Quitar permisos denegados
    const effectivePermissions = withExtra.filter(
      p => !user.deniedPermissions.includes(p)
    );

    return effectivePermissions;
  }

  // Verificar si usuario tiene un permiso específico
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getEffectivePermissions(userId);
    return permissions.includes(permission);
  }

  // Cambiar rol del usuario
  async changeRole(userId: string, newRoleId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const role = await this.rolesService.findById(newRoleId);
    if (!role) {
      throw new BadRequestException('Rol no encontrado');
    }

    user.role = role._id as Types.ObjectId;
    return user.save();
  }

  // Agregar permisos extra
  async addExtraPermissions(userId: string, permissions: string[]): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validar que los permisos existan
    const validPermissions = await this.permissionsService.findByCodes(permissions);
    const validCodes = validPermissions.map(p => p.code);
    const invalidCodes = permissions.filter(p => !validCodes.includes(p));
    
    if (invalidCodes.length > 0) {
      throw new BadRequestException(`Permisos inválidos: ${invalidCodes.join(', ')}`);
    }

    // Agregar sin duplicar
    user.extraPermissions = [...new Set([...user.extraPermissions, ...permissions])];
    return user.save();
  }

  // Quitar permisos extra
  async removeExtraPermissions(userId: string, permissions: string[]): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.extraPermissions = user.extraPermissions.filter(p => !permissions.includes(p));
    return user.save();
  }

  // Denegar permisos del rol
  async addDeniedPermissions(userId: string, permissions: string[]): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.deniedPermissions = [...new Set([...user.deniedPermissions, ...permissions])];
    return user.save();
  }

  // Quitar denegación de permisos
  async removeDeniedPermissions(userId: string, permissions: string[]): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.deniedPermissions = user.deniedPermissions.filter(p => !permissions.includes(p));
    return user.save();
  }

  // Desactivar usuario
  async deactivate(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.isActive = false;
    return user.save();
  }

  // Reactivar usuario
  async reactivate(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.isActive = true;
    return user.save();
  }

  // Actualizar datos del usuario
  async update(userId: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Actualizar nombre y apellido
    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }
    if (updateUserDto.familyName !== undefined) {
      (user as any).family_name = updateUserDto.familyName;
    }

    // Actualizar rol si se proporciona
    if (updateUserDto.roleId) {
      const role = await this.rolesService.findById(updateUserDto.roleId);
      if (!role) {
        throw new BadRequestException('Rol no encontrado');
      }
      user.role = role._id as Types.ObjectId;
    }

    // Actualizar contraseña si se proporciona
    if (updateUserDto.password) {
      const saltRounds = 10;
      user.password = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    return user.save();
  }
}

