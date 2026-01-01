import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateSaleWithPaymentDto } from './dto/create-sale-with-payment.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { StockValidationGuard } from './guards/stock-validation.guard';

@ApiTags('sales')
@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @UseGuards(StockValidationGuard)
  @RequirePermissions('sales:create')
  @ApiOperation({ summary: 'Registrar una nueva venta con uno o más pagos (transacción atómica)' })
  @ApiResponse({ status: 201, description: 'Venta y pagos registrados exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o stock insuficiente' })
  async create(@Body() createDto: CreateSaleWithPaymentDto) {
    const result = await this.salesService.createWithPayment(createDto);
    return {
      message: 'Venta y pagos registrados exitosamente',
      sale: result.sale,
      payments: result.payments,
    };
  }

  @Get()
  @RequirePermissions('sales:read')
  @ApiOperation({ summary: 'Obtener ventas (por defecto solo activas)' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Incluir ventas inactivas' })
  @ApiQuery({ name: 'onlyInactive', required: false, type: Boolean, description: 'Mostrar solo ventas inactivas' })
  @ApiResponse({ status: 200, description: 'Lista de ventas' })
  async findAll(
    @Query('includeInactive') includeInactive?: string,
    @Query('onlyInactive') onlyInactive?: string,
  ) {
    let sales;

    if (onlyInactive === 'true') {
      sales = await this.salesService.findInactive();
    } else if (includeInactive === 'true') {
      sales = await this.salesService.findAllIncludingInactive();
    } else {
      sales = await this.salesService.findAll();
    }

    return { sales };
  }

  @Get(':id')
  @RequirePermissions('sales:read')
  @ApiOperation({ summary: 'Obtener una venta por su ID' })
  @ApiResponse({ status: 200, description: 'Venta encontrada' })
  @ApiResponse({ status: 404, description: 'Venta no encontrada' })
  async findOne(@Param('id') id: string) {
    const sale = await this.salesService.findById(id);
    if (!sale) {
      return { message: 'Venta no encontrada' };
    }
    return { sale };
  }

  @Patch(':id')
  @RequirePermissions('sales:update')
  @ApiOperation({ summary: 'Actualizar una venta' })
  @ApiResponse({ status: 200, description: 'Venta actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Venta no encontrada' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateSaleDto) {
    const sale = await this.salesService.update(id, updateDto);
    return {
      message: 'Venta actualizada exitosamente',
      sale,
    };
  }

  @Delete(':id')
  @RequirePermissions('sales:delete')
  @ApiOperation({ summary: 'Desactivar una venta (borrado lógico)' })
  @ApiResponse({ status: 200, description: 'Venta desactivada exitosamente' })
  @ApiResponse({ status: 404, description: 'Venta no encontrada' })
  async deactivate(@Param('id') id: string) {
    const sale = await this.salesService.deactivate(id);
    return {
      message: 'Venta desactivada exitosamente',
      sale,
    };
  }

  @Patch(':id/reactivate')
  @RequirePermissions('sales:update')
  @ApiOperation({ summary: 'Reactivar una venta desactivada' })
  @ApiResponse({ status: 200, description: 'Venta reactivada exitosamente' })
  @ApiResponse({ status: 404, description: 'Venta no encontrada' })
  async reactivate(@Param('id') id: string) {
    const sale = await this.salesService.reactivate(id);
    return {
      message: 'Venta reactivada exitosamente',
      sale,
    };
  }

  @Delete(':id/permanent')
  @RequirePermissions('sales:delete')
  @ApiOperation({ summary: 'Eliminar permanentemente una venta (irreversible)' })
  @ApiResponse({ status: 200, description: 'Venta eliminada permanentemente' })
  @ApiResponse({ status: 404, description: 'Venta no encontrada' })
  async deletePermanently(@Param('id') id: string) {
    await this.salesService.deletePermanently(id);
    return { message: 'Venta eliminada permanentemente' };
  }
}

