import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('product-categories')
@Controller('product-categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Post()
  @RequirePermissions('product_categories:create')
  @ApiOperation({ summary: 'Crear una nueva categoría de producto' })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente' })
  @ApiResponse({ status: 409, description: 'Ya existe una categoría con ese nombre' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createDto: CreateProductCategoryDto) {
    const category = await this.productCategoriesService.create(createDto);
    return {
      message: 'Categoría creada exitosamente',
      category,
    };
  }

  @Get()
  @RequirePermissions('product_categories:read')
  @ApiOperation({ summary: 'Obtener categorías (por defecto solo activas)' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Incluir categorías inactivas' })
  @ApiQuery({ name: 'onlyInactive', required: false, type: Boolean, description: 'Mostrar solo categorías inactivas' })
  @ApiResponse({ status: 200, description: 'Lista de categorías' })
  async findAll(
    @Query('includeInactive') includeInactive?: string,
    @Query('onlyInactive') onlyInactive?: string,
  ) {
    let categories;
    
    if (onlyInactive === 'true') {
      categories = await this.productCategoriesService.findInactive();
    } else if (includeInactive === 'true') {
      categories = await this.productCategoriesService.findAllIncludingInactive();
    } else {
      categories = await this.productCategoriesService.findAll();
    }
    
    return { categories };
  }

  @Get(':id')
  @RequirePermissions('product_categories:read')
  @ApiOperation({ summary: 'Obtener una categoría por ID' })
  @ApiResponse({ status: 200, description: 'Categoría encontrada' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async findOne(@Param('id') id: string) {
    const category = await this.productCategoriesService.findById(id);
    if (!category) {
      return { message: 'Categoría no encontrada' };
    }
    return { category };
  }

  @Patch(':id')
  @RequirePermissions('product_categories:update')
  @ApiOperation({ summary: 'Actualizar una categoría de producto' })
  @ApiResponse({ status: 200, description: 'Categoría actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 409, description: 'Ya existe una categoría con ese nombre' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductCategoryDto,
  ) {
    const category = await this.productCategoriesService.update(id, updateDto);
    return {
      message: 'Categoría actualizada exitosamente',
      category,
    };
  }

  @Delete(':id')
  @RequirePermissions('product_categories:delete')
  @ApiOperation({ summary: 'Desactivar una categoría (borrado lógico)' })
  @ApiResponse({ status: 200, description: 'Categoría desactivada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async deactivate(@Param('id') id: string) {
    const category = await this.productCategoriesService.deactivate(id);
    return { 
      message: 'Categoría desactivada exitosamente',
      category,
    };
  }

  @Patch(':id/reactivate')
  @RequirePermissions('product_categories:update')
  @ApiOperation({ summary: 'Reactivar una categoría desactivada' })
  @ApiResponse({ status: 200, description: 'Categoría reactivada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async reactivate(@Param('id') id: string) {
    const category = await this.productCategoriesService.reactivate(id);
    return { 
      message: 'Categoría reactivada exitosamente',
      category,
    };
  }

  @Delete(':id/permanent')
  @RequirePermissions('product_categories:delete')
  @ApiOperation({ summary: 'Eliminar permanentemente una categoría (irreversible)' })
  @ApiResponse({ status: 200, description: 'Categoría eliminada permanentemente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async deletePermanently(@Param('id') id: string) {
    await this.productCategoriesService.deletePermanently(id);
    return { message: 'Categoría eliminada permanentemente' };
  }
}

