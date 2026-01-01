import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type LoginAuditDocument = LoginAudit & Document;

export enum LoginAuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
}

@Schema({ timestamps: true })
export class LoginAudit {
  @ApiProperty({ description: 'ID del usuario' })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @ApiProperty({ description: 'Email del intento de login' })
  @Prop({ required: true })
  email: string;

  @ApiProperty({ enum: LoginAuditAction, description: 'Tipo de acción' })
  @Prop({ required: true, enum: LoginAuditAction })
  action: LoginAuditAction;

  @ApiProperty({ description: 'Si la acción fue exitosa' })
  @Prop({ required: true })
  success: boolean;

  @ApiProperty({ description: 'Dirección IP del cliente' })
  @Prop()
  ipAddress?: string;

  @ApiProperty({ description: 'User Agent del navegador' })
  @Prop()
  userAgent?: string;

  @ApiProperty({ description: 'Mensaje adicional (ej: razón de fallo)' })
  @Prop()
  message?: string;
}

export const LoginAuditSchema = SchemaFactory.createForClass(LoginAudit);

// Índices para búsquedas eficientes
LoginAuditSchema.index({ userId: 1, createdAt: -1 });
LoginAuditSchema.index({ email: 1, createdAt: -1 });
LoginAuditSchema.index({ action: 1, createdAt: -1 });
LoginAuditSchema.index({ createdAt: -1 });
