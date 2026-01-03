import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CashRegisterService } from './cash-register.service';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { CreateCashCutDto } from './dto/create-cash-cut.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('cash-register')
@Controller('cash-register')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Post('open')
  @RequirePermissions('cash_register:create')
  @ApiOperation({ summary: 'Abrir una nueva caja' })
  @ApiResponse({ status: 201, description: 'Caja abierta exitosamente' })
  @ApiResponse({ status: 409, description: 'Ya existe una caja abierta' })
  async openCashRegister(@Body() openDto: OpenCashRegisterDto) {
    const cashRegister =
      await this.cashRegisterService.openCashRegister(openDto);
    return {
      message: 'Caja abierta exitosamente',
      cashRegister,
    };
  }

  @Get('status')
  @RequirePermissions('cash_register:read')
  @ApiOperation({ summary: 'Obtener el estado de la caja (información ligera para el frontend)' })
  @ApiResponse({ status: 200, description: 'Estado de la caja' })
  async getCashRegisterStatus() {
    const status = await this.cashRegisterService.getCashRegisterStatus();
    return { status };
  }

  @Get('current')
  @RequirePermissions('cash_register:read')
  @ApiOperation({ summary: 'Obtener la caja actual abierta (información completa)' })
  @ApiResponse({ status: 200, description: 'Caja actual' })
  @ApiResponse({ status: 404, description: 'No hay caja abierta' })
  async getCurrentCashRegister() {
    const cashRegister =
      await this.cashRegisterService.getCurrentCashRegister();
    if (!cashRegister) {
      return { message: 'No hay una caja abierta', cashRegister: null };
    }
    return { cashRegister };
  }

  @Get()
  @RequirePermissions('cash_register:read')
  @ApiOperation({ summary: 'Obtener todas las cajas (abiertas y cerradas)' })
  @ApiResponse({ status: 200, description: 'Lista de cajas' })
  async findAllCashRegisters() {
    const cashRegisters = await this.cashRegisterService.findAllCashRegisters();
    return { cashRegisters };
  }

  @Get(':id')
  @RequirePermissions('cash_register:read')
  @ApiOperation({
    summary: 'Obtener una caja por su ID con todos sus pagos asociados',
  })
  @ApiResponse({ status: 200, description: 'Caja encontrada con pagos' })
  @ApiResponse({ status: 404, description: 'Caja no encontrada' })
  async findCashRegisterById(@Param('id') id: string) {
    const result = await this.cashRegisterService.findCashRegisterById(id);
    if (!result.cashRegister) {
      return { message: 'Caja no encontrada' };
    }
    return {
      cashRegister: result.cashRegister,
      payments: result.payments,
    };
  }

  @Patch('close')
  @RequirePermissions('cash_register:update')
  @ApiOperation({ summary: 'Cerrar la caja actual' })
  @ApiResponse({ status: 200, description: 'Caja cerrada exitosamente' })
  @ApiResponse({ status: 404, description: 'No hay caja abierta para cerrar' })
  async closeCashRegister(
    @Body() closeDto: CloseCashRegisterDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user._id;
    const cashRegister = await this.cashRegisterService.closeCashRegister(
      closeDto,
      userId,
    );
    return {
      message: 'Caja cerrada exitosamente',
      cashRegister,
    };
  }

  @Post('cut')
  @RequirePermissions('cash_register:create')
  @ApiOperation({
    summary:
      'Realizar un corte de caja (extrae efectivo y abre nueva caja con fondo inicial)',
  })
  @ApiResponse({ status: 201, description: 'Corte realizado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o caja no abierta',
  })
  async createCashCut(@Body() cutDto: CreateCashCutDto) {
    const result = await this.cashRegisterService.createCashCut(cutDto);
    return {
      message: 'Corte de caja realizado exitosamente',
      cashCut: result.cashCut,
      newCashRegister: result.newCashRegister,
    };
  }

  @Get('cuts/all')
  @RequirePermissions('cash_register:read')
  @ApiOperation({ summary: 'Obtener todos los cortes de caja' })
  @ApiResponse({ status: 200, description: 'Lista de cortes' })
  async findAllCashCuts() {
    const cashCuts = await this.cashRegisterService.findAllCashCuts();
    return { cashCuts };
  }

  @Get('cuts/by-register/:cashRegisterId')
  @RequirePermissions('cash_register:read')
  @ApiOperation({ summary: 'Obtener cortes de una caja específica' })
  @ApiResponse({ status: 200, description: 'Lista de cortes de la caja' })
  async findCashCutsByRegister(
    @Param('cashRegisterId') cashRegisterId: string,
  ) {
    const cashCuts =
      await this.cashRegisterService.findCashCutsByRegister(cashRegisterId);
    return { cashCuts };
  }
}
