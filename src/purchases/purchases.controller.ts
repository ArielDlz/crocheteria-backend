import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('purchases')
@Controller('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @RequirePermissions('purchases:create')
  @ApiOperation({ summary: 'Registrar una nueva compra' })
  @ApiResponse({ status: 201, description: 'Compra registrada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createDto: CreatePurchaseDto) {
    const purchase = await this.purchasesService.create(createDto);
    return {
      message: 'Compra registrada exitosamente',
      purchase,
    };
  }

  @Get()
  @RequirePermissions('purchases:read')
  @ApiOperation({ summary: 'Obtener compras (por defecto solo activas)' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Incluir compras inactivas' })
  @ApiQuery({ name: 'onlyInactive', required: false, type: Boolean, description: 'Mostrar solo compras inactivas' })
  @ApiQuery({ name: 'startup', required: false, type: Boolean, description: 'Filtrar por tipo: true = emprendimientos, false = compras regulares' })
  @ApiResponse({ status: 200, description: 'Lista de compras' })
  async findAll(
    @Query('includeInactive') includeInactive?: string,
    @Query('onlyInactive') onlyInactive?: string,
    @Query('startup') startup?: string,
  ) {
    // Convertir startup a boolean si se proporciona
    const startupFilter = startup === 'true' ? true : startup === 'false' ? false : undefined;

    let purchases;

    if (onlyInactive === 'true') {
      purchases = await this.purchasesService.findInactive(startupFilter);
    } else if (includeInactive === 'true') {
      purchases = await this.purchasesService.findAllIncludingInactive(startupFilter);
    } else {
      purchases = await this.purchasesService.findAll(startupFilter);
    }

    return { purchases };
  }

  @Get(':id')
  @RequirePermissions('purchases:read')
  @ApiOperation({ summary: 'Obtener una compra por su ID' })
  @ApiResponse({ status: 200, description: 'Compra encontrada' })
  @ApiResponse({ status: 404, description: 'Compra no encontrada' })
  async findOne(@Param('id') id: string) {
    const purchase = await this.purchasesService.findById(id);
    if (!purchase) {
      return { message: 'Compra no encontrada' };
    }
    return { purchase };
  }

  @Patch(':id')
  @RequirePermissions('purchases:update')
  @ApiOperation({ summary: 'Actualizar una compra' })
  @ApiResponse({ status: 200, description: 'Compra actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Compra no encontrada' })
  async update(@Param('id') id: string, @Body() updateDto: UpdatePurchaseDto) {
    const purchase = await this.purchasesService.update(id, updateDto);
    return {
      message: 'Compra actualizada exitosamente',
      purchase,
    };
  }

  @Delete(':id')
  @RequirePermissions('purchases:delete')
  @ApiOperation({ summary: 'Desactivar una compra (borrado lógico)' })
  @ApiResponse({ status: 200, description: 'Compra desactivada exitosamente' })
  @ApiResponse({ status: 404, description: 'Compra no encontrada' })
  async deactivate(@Param('id') id: string) {
    const purchase = await this.purchasesService.deactivate(id);
    return {
      message: 'Compra desactivada exitosamente',
      purchase,
    };
  }

  @Patch(':id/reactivate')
  @RequirePermissions('purchases:update')
  @ApiOperation({ summary: 'Reactivar una compra desactivada' })
  @ApiResponse({ status: 200, description: 'Compra reactivada exitosamente' })
  @ApiResponse({ status: 404, description: 'Compra no encontrada' })
  async reactivate(@Param('id') id: string) {
    const purchase = await this.purchasesService.reactivate(id);
    return {
      message: 'Compra reactivada exitosamente',
      purchase,
    };
  }

  @Delete(':id/permanent')
  @RequirePermissions('purchases:delete')
  @ApiOperation({ summary: 'Eliminar permanentemente una compra (irreversible)' })
  @ApiResponse({ status: 200, description: 'Compra eliminada permanentemente' })
  @ApiResponse({ status: 404, description: 'Compra no encontrada' })
  async deletePermanently(@Param('id') id: string) {
    await this.purchasesService.deletePermanently(id);
    return { message: 'Compra eliminada permanentemente' };
  }
}

