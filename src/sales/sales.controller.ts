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
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateSaleWithPaymentDto } from './dto/create-sale-with-payment.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { AccountSaleLineDto } from '../accounts/dto/account-sale-line.dto';
import { AccountsService } from '../accounts/accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { StockValidationGuard } from './guards/stock-validation.guard';
import { Request } from '@nestjs/common';

@ApiTags('sales')
@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly accountsService: AccountsService,
  ) {}

  @Post()
  @UseGuards(StockValidationGuard)
  @RequirePermissions('sales:create')
  @ApiOperation({
    summary:
      'Registrar una nueva venta con uno o más pagos (transacción atómica)',
  })
  @ApiResponse({
    status: 201,
    description: 'Venta y pagos registrados exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o stock insuficiente',
  })
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
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir ventas inactivas',
  })
  @ApiQuery({
    name: 'onlyInactive',
    required: false,
    type: Boolean,
    description: 'Mostrar solo ventas inactivas',
  })
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

  @Get('lines')
  @RequirePermissions('sales:read')
  @ApiOperation({
    summary: 'Obtener todas las sales_lines de las ventas con información detallada para contabilización',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Fecha de inicio (ISO 8601, ej: 2026-01-01)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Fecha de fin (ISO 8601, ej: 2026-01-31)',
  })
  @ApiResponse({
    status: 200,
    description: 'Sales lines obtenidas exitosamente',
  })
  async findSaleLines(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Convertir strings de fecha a Date objects
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    // Validar que las fechas sean válidas
    if (startDate && startDateObj && isNaN(startDateObj.getTime())) {
      throw new BadRequestException('Fecha de inicio inválida');
    }
    if (endDate && endDateObj && isNaN(endDateObj.getTime())) {
      throw new BadRequestException('Fecha de fin inválida');
    }

    const sales = await this.salesService.findAllSaleLinesByDateRange(
      startDateObj,
      endDateObj,
    );

    // Formatear todas las sales_lines de todas las ventas
    const sales_lines: any[] = [];

    for (const sale of sales) {
      for (const line of sale.sales_lines) {
        const product = line.product as any;
        
        // Calcular ganancia potencial (para productos no startup es line_total - line_total_cost)
        // Para productos startup, usar la comisión guardada en el schema
        let potentialProfit = 0;
        let isStartup = false;

        if (product && product.categories) {
          // Verificar si el producto pertenece a una categoría startup
          const startupCategory = product.categories.find(
            (cat: any) => cat.startup === true,
          );

          if (startupCategory) {
            isStartup = true;
            // Usar la comisión guardada en el schema (ya calculada durante la creación de la venta)
            // Si no existe (ventas antiguas), calcular desde la categoría como fallback
            if (line.commission !== undefined && line.commission !== null) {
              potentialProfit = line.commission;
            } else {
              // Fallback para ventas antiguas sin comisión guardada
              if (
                startupCategory.comision_type === 'Porcentaje' &&
                startupCategory.comision_ammount
              ) {
                potentialProfit = Math.round(
                  (line.line_total * startupCategory.comision_ammount) / 100,
                );
              } else if (
                (startupCategory.comision_type === 'Monto Fijo' ||
                  startupCategory.comision_type === 'Monto fijo' ||
                  startupCategory.comision_type === 'Cantidad Fija' ||
                  startupCategory.comision_type === 'Cantidad fija') &&
                startupCategory.comision_ammount
              ) {
                potentialProfit = startupCategory.comision_ammount * line.quantity;
              }
            }
          } else {
            // No es startup, la ganancia es line_total - line_total_cost
            potentialProfit = line.line_total - line.line_total_cost;
          }
        } else {
          // Si no hay categorías o producto, calcular ganancia estándar
          potentialProfit = line.line_total - line.line_total_cost;
        }

        sales_lines.push({
          date: sale.createdAt,
          sale_id: sale._id,
          index: line.index !== undefined ? line.index : null, // Para ventas antiguas sin índice
          product: product?.name || 'Producto no encontrado',
          quantity: line.quantity,
          sell_price: line.sell_price,
          purchase_price: line.purchase_price,
          line_total: line.line_total,
          line_total_cost: line.line_total_cost,
          accounted: line.accounted,
          potential_profit: potentialProfit,
          rent_amount: line.rent_amount || null,
          remaining_profit_after_rent:
            line.rent_amount !== undefined
              ? potentialProfit - line.rent_amount
              : potentialProfit,
          startup: isStartup,
          startup_comission: line.commission !== undefined ? line.commission : null,
        });
      }
    }

    return {
      sales_lines,
    };
  }

  @Post(':id/:index')
  @RequirePermissions('sales:update')
  @ApiOperation({
    summary: 'Contabilizar una línea de venta específica por índice',
    description: 'Recibe los montos directamente del frontend para contabilizar la línea en los apartados',
  })
  @ApiResponse({
    status: 200,
    description: 'Línea contabilizada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o línea ya contabilizada',
  })
  @ApiResponse({
    status: 404,
    description: 'Venta no encontrada',
  })
  async accountSaleLineByIndex(
    @Param('id') id: string,
    @Param('index') index: string,
    @Body() accountSaleLineDto: AccountSaleLineDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user._id;
    const lineIndex = parseInt(index, 10);
    
    if (isNaN(lineIndex) || lineIndex < 0) {
      throw new BadRequestException(`Índice inválido: ${index}`);
    }

    const sale = await this.accountsService.accountSaleLineByIndex(
      id,
      lineIndex,
      accountSaleLineDto,
      userId,
    );
    return {
      message: 'Línea contabilizada exitosamente',
      sale,
    };
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
  @ApiOperation({
    summary: 'Eliminar permanentemente una venta (irreversible)',
  })
  @ApiResponse({ status: 200, description: 'Venta eliminada permanentemente' })
  @ApiResponse({ status: 404, description: 'Venta no encontrada' })
  async deletePermanently(@Param('id') id: string) {
    await this.salesService.deletePermanently(id);
    return { message: 'Venta eliminada permanentemente' };
  }
}
