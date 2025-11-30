import { Module, forwardRef } from '@nestjs/common';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    forwardRef(() => PermissionsModule),
    forwardRef(() => RolesModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [SetupController],
  providers: [SetupService],
  exports: [SetupService],
})
export class SetupModule {}

