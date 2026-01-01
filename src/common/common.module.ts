import { Module, Global, forwardRef } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './guards/permissions.guard';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [forwardRef(() => UsersModule)],
  providers: [
    PermissionsGuard,
    // Registrar como guard global (opcional, se puede usar por endpoint)
    // {
    //   provide: APP_GUARD,
    //   useClass: PermissionsGuard,
    // },
  ],
  exports: [PermissionsGuard, UsersModule],
})
export class CommonModule {}
