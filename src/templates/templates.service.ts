import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Template, TemplateDocument } from './schemas/template.schema';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectModel(Template.name) private templateModel: Model<TemplateDocument>,
  ) {}

  async findByIdentifier(identifier: string): Promise<TemplateDocument> {
    const template = await this.templateModel.findOne({ identifier }).exec();
    
    if (!template) {
      throw new NotFoundException(`Template con identifier '${identifier}' no encontrado`);
    }

    return template;
  }
}

