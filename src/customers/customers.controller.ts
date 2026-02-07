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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @RequirePermissions('customers:create')
  @ApiOperation({ summary: 'Crear un nuevo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createDto: CreateCustomerDto) {
    const customer = await this.customersService.create(createDto);
    return {
      message: 'Cliente creado exitosamente',
      customer,
    };
  }

  @Get()
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Obtener clientes (por defecto solo activos)' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir clientes inactivos',
  })
  @ApiQuery({
    name: 'onlyInactive',
    required: false,
    type: Boolean,
    description: 'Mostrar solo clientes inactivos',
  })
  @ApiResponse({ status: 200, description: 'Lista de clientes' })
  async findAll(
    @Query('includeInactive') includeInactive?: string,
    @Query('onlyInactive') onlyInactive?: string,
  ) {
    let customers;

    if (onlyInactive === 'true') {
      customers = await this.customersService.findInactive();
    } else if (includeInactive === 'true') {
      customers = await this.customersService.findAllIncludingInactive();
    } else {
      customers = await this.customersService.findAll();
    }

    return { customers };
  }

  @Get(':id')
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Obtener un cliente por ID' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async findOne(@Param('id') id: string) {
    const customer = await this.customersService.findById(id);
    if (!customer) {
      return { message: 'Cliente no encontrado' };
    }
    return { customer };
  }

  @Patch(':id')
  @RequirePermissions('customers:update')
  @ApiOperation({ summary: 'Actualizar un cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerDto,
  ) {
    const customer = await this.customersService.update(id, updateDto);
    return {
      message: 'Cliente actualizado exitosamente',
      customer,
    };
  }

  @Delete(':id')
  @RequirePermissions('customers:delete')
  @ApiOperation({ summary: 'Desactivar un cliente (borrado lógico)' })
  @ApiResponse({
    status: 200,
    description: 'Cliente desactivado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async deactivate(@Param('id') id: string) {
    const customer = await this.customersService.deactivate(id);
    return {
      message: 'Cliente desactivado exitosamente',
      customer,
    };
  }

  @Patch(':id/reactivate')
  @RequirePermissions('customers:update')
  @ApiOperation({ summary: 'Reactivar un cliente desactivado' })
  @ApiResponse({
    status: 200,
    description: 'Cliente reactivado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async reactivate(@Param('id') id: string) {
    const customer = await this.customersService.reactivate(id);
    return {
      message: 'Cliente reactivado exitosamente',
      customer,
    };
  }

  @Delete(':id/permanent')
  @RequirePermissions('customers:delete')
  @ApiOperation({
    summary: 'Eliminar permanentemente un cliente (irreversible)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cliente eliminado permanentemente',
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async deletePermanently(@Param('id') id: string) {
    await this.customersService.deletePermanently(id);
    return { message: 'Cliente eliminado permanentemente' };
  }
}
