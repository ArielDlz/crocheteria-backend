import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PERMISSIONS_ANY_KEY,
} from '../decorators/permissions.decorator';
import { UsersService } from '../../users/users.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obtener permisos requeridos del decorador
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredAnyPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_ANY_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay permisos requeridos, permitir acceso
    if (!requiredPermissions?.length && !requiredAnyPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('No autorizado');
    }

    // Obtener permisos efectivos del usuario
    const userPermissions = await this.usersService.getEffectivePermissions(
      user.userId,
    );

    // Verificar permisos requeridos (ALL)
    if (requiredPermissions?.length) {
      const hasAllPermissions = requiredPermissions.every((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasAllPermissions) {
        throw new ForbiddenException(
          `Permisos insuficientes. Requeridos: ${requiredPermissions.join(', ')}`,
        );
      }
    }

    // Verificar permisos requeridos (ANY)
    if (requiredAnyPermissions?.length) {
      const hasAnyPermission = requiredAnyPermissions.some((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasAnyPermission) {
        throw new ForbiddenException(
          `Permisos insuficientes. Se requiere al menos uno de: ${requiredAnyPermissions.join(', ')}`,
        );
      }
    }

    return true;
  }
}
