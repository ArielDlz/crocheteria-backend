import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type PermissionAuditDocument = PermissionAudit & Document;

export enum PermissionAuditAction {
  ROLE_CHANGED = 'ROLE_CHANGED',
  PERMISSION_ADDED = 'PERMISSION_ADDED',
  PERMISSION_REMOVED = 'PERMISSION_REMOVED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PERMISSION_UNDENIED = 'PERMISSION_UNDENIED',
  USER_CREATED = 'USER_CREATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_REACTIVATED = 'USER_REACTIVATED',
}

@Schema({ timestamps: true })
export class PermissionAudit {
  @ApiProperty({ description: 'Usuario que realizó la acción' })
  @Prop({ type: Object, required: true })
  performedBy: {
    userId: Types.ObjectId;
    email: string;
  };

  @ApiProperty({ description: 'Usuario afectado por la acción' })
  @Prop({ type: Object, required: true })
  targetUser: {
    userId: Types.ObjectId;
    email: string;
  };

  @ApiProperty({ enum: PermissionAuditAction, description: 'Tipo de acción' })
  @Prop({ required: true, enum: PermissionAuditAction })
  action: PermissionAuditAction;

  @ApiProperty({ description: 'Detalles del cambio' })
  @Prop({ type: Object, required: true })
  details: {
    permission?: string;
    previousRole?: string;
    newRole?: string;
    initialRole?: string;
    permissionsAfter?: string[];
  };

  @ApiProperty({ description: 'Motivo del cambio (opcional)' })
  @Prop()
  reason?: string;

  @ApiProperty({
    description: 'Dirección IP del usuario que realizó la acción',
  })
  @Prop()
  ipAddress?: string;
}

export const PermissionAuditSchema =
  SchemaFactory.createForClass(PermissionAudit);

// Índices para búsquedas eficientes
PermissionAuditSchema.index({ 'targetUser.userId': 1, createdAt: -1 });
PermissionAuditSchema.index({ 'performedBy.userId': 1, createdAt: -1 });
PermissionAuditSchema.index({ action: 1, createdAt: -1 });
PermissionAuditSchema.index({ createdAt: -1 });
