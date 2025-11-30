import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorador para requerir permisos específicos en un endpoint
 * @param permissions Lista de permisos requeridos (se necesitan TODOS)
 * @example @RequirePermissions('users:read', 'users:update')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const PERMISSIONS_ANY_KEY = 'permissions_any';

/**
 * Decorador para requerir al menos UNO de los permisos
 * @param permissions Lista de permisos (se necesita AL MENOS UNO)
 * @example @RequireAnyPermission('users:read', 'users:update')
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_ANY_KEY, permissions);

