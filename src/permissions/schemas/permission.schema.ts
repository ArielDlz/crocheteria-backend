import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type PermissionDocument = Permission & Document;

@Schema({ timestamps: true })
export class Permission {
  @ApiProperty({ example: 'sales', description: 'Nombre del módulo' })
  @Prop({ required: true })
  module: string;

  @ApiProperty({ example: 'create', description: 'Acción del permiso' })
  @Prop({ required: true })
  action: string;

  @ApiProperty({
    example: 'sales:create',
    description: 'Código único del permiso',
  })
  @Prop({ required: true, unique: true })
  code: string;

  @ApiProperty({
    example: 'Crear ventas',
    description: 'Descripción del permiso',
  })
  @Prop({ required: true })
  description: string;

  @ApiProperty({ example: true, description: 'Si el permiso está activo' })
  @Prop({ default: true })
  isActive: boolean;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);

// Índice compuesto para búsquedas eficientes
PermissionSchema.index({ module: 1, action: 1 }, { unique: true });
