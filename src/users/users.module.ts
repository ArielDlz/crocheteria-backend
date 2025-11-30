import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { RolesModule } from '../roles/roles.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => RolesModule),
    forwardRef(() => PermissionsModule),
    forwardRef(() => AuditModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

