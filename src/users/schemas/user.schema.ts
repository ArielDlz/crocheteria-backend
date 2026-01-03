import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @ApiProperty({ example: 'Juan', description: 'Nombre del usuario' })
  @Prop({ trim: true })
  name?: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido del usuario' })
  @Prop({ type: String, trim: true })
  family_name?: string;

  @Prop({ required: true })
  password: string;

  @ApiProperty({ description: 'ID del rol asignado al usuario' })
  @Prop({ type: Types.ObjectId, ref: 'Role' })
  role?: Types.ObjectId;

  @ApiProperty({
    example: ['sales:cancel'],
    description: 'Permisos adicionales (además de los del rol)',
  })
  @Prop({ type: [String], default: [] })
  extraPermissions: string[];

  @ApiProperty({
    example: [],
    description: 'Permisos denegados (del rol)',
  })
  @Prop({ type: [String], default: [] })
  deniedPermissions: string[];

  @ApiProperty({ example: true })
  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Virtual para acceder a family_name como familyName (camelCase)
UserSchema.virtual('familyName')
  .get(function () {
    return this.family_name;
  })
  .set(function (value: string) {
    this.family_name = value;
  });

// Asegurar que los virtuals se incluyan en JSON y toObject
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// Índice para búsquedas por rol
UserSchema.index({ role: 1 });
