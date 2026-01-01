import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type TemplateDocument = Template & Document;

@Schema({ timestamps: true })
export class Template {
  @ApiProperty({
    example: 'user-form',
    description: 'Identificador único del template',
  })
  @Prop({ required: true, unique: true, trim: true })
  identifier: string;

  @ApiProperty({
    description:
      'Estructura flexible del template (puede contener cualquier estructura JSON)',
    example: {
      fields: [
        { name: 'email', type: 'email', required: true },
        { name: 'name', type: 'text', required: true },
      ],
      options: {
        submitText: 'Guardar',
        cancelText: 'Cancelar',
      },
    },
  })
  @Prop({ type: Object, required: true })
  data: Record<string, any>;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt?: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt?: Date;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);

// Índice para búsquedas rápidas por identifier
TemplateSchema.index({ identifier: 1 }, { unique: true });
