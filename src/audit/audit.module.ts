import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import {
  PermissionAudit,
  PermissionAuditSchema,
} from './schemas/permission-audit.schema';
import { LoginAudit, LoginAuditSchema } from './schemas/login-audit.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PermissionAudit.name, schema: PermissionAuditSchema },
      { name: LoginAudit.name, schema: LoginAuditSchema },
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
