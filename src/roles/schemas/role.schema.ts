import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @ApiProperty({ example: 'vendedor', description: 'Nombre único del rol' })
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  name: string;

  @ApiProperty({ example: 'Vendedor de tienda', description: 'Descripción del rol' })
  @Prop({ required: true })
  description: string;

  @ApiProperty({ 
    example: ['sales:create', 'sales:read'], 
    description: 'Lista de códigos de permisos asignados al rol' 
  })
  @Prop({ type: [String], default: [] })
  permissions: string[];

  @ApiProperty({ example: false, description: 'Si es el rol de super administrador' })
  @Prop({ default: false })
  isSuperAdmin: boolean;

  @ApiProperty({ example: true, description: 'Si el rol está activo' })
  @Prop({ default: true })
  isActive: boolean;

  @ApiProperty({ example: false, description: 'Si el rol es del sistema (no editable)' })
  @Prop({ default: false })
  isSystem: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

