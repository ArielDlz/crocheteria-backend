import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuditService } from '../audit/audit.service';
import { LoginAuditAction } from '../audit/schemas/login-audit.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async validateUser(email: string, password: string): Promise<Omit<UserDocument, 'password'> | null> {
    const user = await this.usersService.findByEmail(email);
    
    if (user && await this.usersService.validatePassword(password, user.password)) {
      // Excluir la contraseña del resultado
      const { password: _, ...result } = user.toObject();
      return result as Omit<UserDocument, 'password'>;
    }
    
    return null;
  }

  async login(user: any, ipAddress?: string, userAgent?: string) {
    const payload: JwtPayload = { 
      email: user.email, 
      sub: user._id.toString() 
    };

    // Obtener permisos efectivos
    const permissions = await this.usersService.getEffectivePermissions(user._id.toString());
    
    // Registrar login exitoso en auditoría
    await this.auditService.logLogin(
      user.email,
      LoginAuditAction.LOGIN_SUCCESS,
      true,
      user._id.toString(),
      ipAddress,
      userAgent,
    );

    // Obtener info del rol
    const fullUser = await this.usersService.findById(user._id.toString());
    const role = fullUser?.role as any;

    return {
      message: 'Inicio de sesión exitoso',
      user: {
        id: user._id,
        email: user.email,
        role: role ? {
          id: role._id,
          name: role.name,
          isSuperAdmin: role.isSuperAdmin,
        } : null,
      },
      permissions,
      access_token: this.jwtService.sign(payload),
    };
  }

  async logFailedLogin(email: string, ipAddress?: string, userAgent?: string) {
    await this.auditService.logLogin(
      email,
      LoginAuditAction.LOGIN_FAILED,
      false,
      undefined,
      ipAddress,
      userAgent,
      'Credenciales inválidas',
    );
  }

  async register(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const user = await this.usersService.create({ email, password });
    
    const payload: JwtPayload = { 
      email: user.email, 
      sub: user._id.toString() 
    };

    // Obtener permisos efectivos (del rol por defecto)
    const permissions = await this.usersService.getEffectivePermissions(user._id.toString());

    // Registrar en auditoría
    await this.auditService.logLogin(
      email,
      LoginAuditAction.LOGIN_SUCCESS,
      true,
      user._id.toString(),
      ipAddress,
      userAgent,
      'Registro de nuevo usuario',
    );

    // Obtener info del rol
    const fullUser = await this.usersService.findById(user._id.toString());
    const role = fullUser?.role as any;

    return {
      message: 'Usuario registrado exitosamente',
      user: {
        id: user._id,
        email: user.email,
        role: role ? {
          id: role._id,
          name: role.name,
          isSuperAdmin: role.isSuperAdmin,
        } : null,
      },
      permissions,
      access_token: this.jwtService.sign(payload),
    };
  }
}

