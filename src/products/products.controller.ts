import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions('products:create')
  @ApiOperation({ summary: 'Crear un nuevo producto' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createDto: CreateProductDto) {
    const product = await this.productsService.create(createDto);
    return {
      message: 'Producto creado exitosamente',
      product,
    };
  }

  @Get()
  @RequirePermissions('products:read')
  @ApiOperation({ summary: 'Obtener productos (por defecto solo activos)' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir productos inactivos',
  })
  @ApiQuery({
    name: 'onlyInactive',
    required: false,
    type: Boolean,
    description: 'Mostrar solo productos inactivos',
  })
  @ApiResponse({ status: 200, description: 'Lista de productos' })
  async findAll(
    @Query('includeInactive') includeInactive?: string,
    @Query('onlyInactive') onlyInactive?: string,
  ) {
    let products;

    if (onlyInactive === 'true') {
      products = await this.productsService.findInactive();
    } else if (includeInactive === 'true') {
      products = await this.productsService.findAllIncludingInactive();
    } else {
      products = await this.productsService.findAll();
    }

    return { products };
  }

  @Get(':id')
  @RequirePermissions('products:read')
  @ApiOperation({ summary: 'Obtener un producto por su ID' })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findById(id);
    if (!product) {
      return { message: 'Producto no encontrado' };
    }
    return { product };
  }

  @Patch(':id')
  @RequirePermissions('products:update')
  @ApiOperation({ summary: 'Actualizar un producto' })
  @ApiResponse({
    status: 200,
    description: 'Producto actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateProductDto) {
    const product = await this.productsService.update(id, updateDto);
    return {
      message: 'Producto actualizado exitosamente',
      product,
    };
  }

  @Delete(':id')
  @RequirePermissions('products:delete')
  @ApiOperation({ summary: 'Desactivar un producto (borrado lógico)' })
  @ApiResponse({
    status: 200,
    description: 'Producto desactivado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async deactivate(@Param('id') id: string) {
    const product = await this.productsService.deactivate(id);
    return {
      message: 'Producto desactivado exitosamente',
      product,
    };
  }

  @Patch(':id/reactivate')
  @RequirePermissions('products:update')
  @ApiOperation({ summary: 'Reactivar un producto desactivado' })
  @ApiResponse({ status: 200, description: 'Producto reactivado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async reactivate(@Param('id') id: string) {
    const product = await this.productsService.reactivate(id);
    return {
      message: 'Producto reactivado exitosamente',
      product,
    };
  }

  @Delete(':id/permanent')
  @RequirePermissions('products:delete')
  @ApiOperation({
    summary: 'Eliminar permanentemente un producto (irreversible)',
  })
  @ApiResponse({
    status: 200,
    description: 'Producto eliminado permanentemente',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async deletePermanently(@Param('id') id: string) {
    await this.productsService.deletePermanently(id);
    return { message: 'Producto eliminado permanentemente' };
  }
}
