import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get(':identifier')
  @ApiOperation({ 
    summary: 'Obtener un template por su identifier',
    description: 'Retorna la estructura flexible del template que puede variar según el tipo'
  })
  @ApiParam({ 
    name: 'identifier', 
    description: 'Identificador único del template',
    example: 'user-form'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Template encontrado',
    schema: {
      type: 'object',
      properties: {
        identifier: { type: 'string', example: 'user-form' },
        data: { 
          type: 'object',
          description: 'Estructura flexible que puede variar según el template'
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Template no encontrado' })
  async findByIdentifier(@Param('identifier') identifier: string) {
    const template = await this.templatesService.findByIdentifier(identifier);
    
    return {
      identifier: template.identifier,
      data: template.data,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}

