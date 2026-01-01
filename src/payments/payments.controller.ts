import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequirePermissions('payments:create')
  @ApiOperation({ summary: 'Registrar un nuevo pago' })
  @ApiResponse({ status: 201, description: 'Pago registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createDto: CreatePaymentDto) {
    const payment = await this.paymentsService.create(createDto);
    return {
      message: 'Pago registrado exitosamente',
      payment,
    };
  }

  @Get()
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Obtener todos los pagos' })
  @ApiResponse({ status: 200, description: 'Lista de pagos' })
  async findAll() {
    const payments = await this.paymentsService.findAll();
    return { payments };
  }

  @Get('by-sale/:saleId')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Obtener pagos de una venta específica' })
  @ApiResponse({ status: 200, description: 'Lista de pagos de la venta' })
  @ApiResponse({ status: 404, description: 'Venta no encontrada' })
  async findBySale(@Param('saleId') saleId: string) {
    const payments = await this.paymentsService.findBySale(saleId);
    return { payments };
  }

  @Get(':id')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Obtener un pago por su ID' })
  @ApiResponse({ status: 200, description: 'Pago encontrado' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  async findOne(@Param('id') id: string) {
    const payment = await this.paymentsService.findById(id);
    if (!payment) {
      return { message: 'Pago no encontrado' };
    }
    return { payment };
  }

  @Patch(':id')
  @RequirePermissions('payments:update')
  @ApiOperation({ summary: 'Actualizar un pago' })
  @ApiResponse({ status: 200, description: 'Pago actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  async update(@Param('id') id: string, @Body() updateDto: UpdatePaymentDto) {
    const payment = await this.paymentsService.update(id, updateDto);
    return {
      message: 'Pago actualizado exitosamente',
      payment,
    };
  }

  @Delete(':id')
  @RequirePermissions('payments:delete')
  @ApiOperation({ summary: 'Eliminar permanentemente un pago (irreversible)' })
  @ApiResponse({ status: 200, description: 'Pago eliminado permanentemente' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  async deletePermanently(@Param('id') id: string) {
    await this.paymentsService.deletePermanently(id);
    return { message: 'Pago eliminado permanentemente' };
  }
}
