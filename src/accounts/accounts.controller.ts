import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { AccountLinesDto } from './dto/account-lines.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('accounts')
@Controller('accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'Obtener todas las cuentas con sus saldos' })
  @ApiResponse({ status: 200, description: 'Lista de cuentas' })
  async findAllAccounts() {
    const accounts = await this.accountsService.findAllAccounts();
    return { accounts };
  }

  @Get(':id')
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'Obtener una cuenta por ID con su saldo' })
  @ApiResponse({ status: 200, description: 'Cuenta encontrada' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  async findAccountById(@Param('id') id: string) {
    const account = await this.accountsService.findAccountById(id);
    if (!account) {
      return { message: 'Cuenta no encontrada' };
    }
    return { account };
  }

  @Get(':id/balance')
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'Obtener solo el saldo de una cuenta' })
  @ApiResponse({ status: 200, description: 'Saldo de la cuenta' })
  async getAccountBalance(@Param('id') id: string) {
    const balance = await this.accountsService.getAccountBalance(id);
    return { accountId: id, balance };
  }

  @Get(':id/transactions')
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'Obtener transacciones de una cuenta' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Lista de transacciones' })
  async findTransactionsByAccount(
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    const transactions =
      await this.accountsService.findTransactionsByAccount(id, limit, skip);
    return { transactions };
  }

  @Post(':id/withdraw')
  @RequirePermissions('accounts:update')
  @ApiOperation({ summary: 'Retirar dinero de una cuenta' })
  @ApiResponse({ status: 201, description: 'Retiro realizado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Saldo insuficiente o caja abierta',
  })
  async createWithdrawal(
    @Param('id') id: string,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user._id;
    const withdrawal = await this.accountsService.createWithdrawal(
      id,
      createWithdrawalDto,
      userId,
    );
    return {
      message: 'Retiro realizado exitosamente',
      withdrawal,
    };
  }

  @Get(':id/withdrawals')
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'Obtener retiros de una cuenta específica' })
  @ApiResponse({ status: 200, description: 'Lista de retiros' })
  async findWithdrawalsByAccount(@Param('id') id: string) {
    const withdrawals = await this.accountsService.findWithdrawalsByAccount(id);
    return { withdrawals };
  }
}

@ApiTags('withdrawals')
@Controller('withdrawals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class WithdrawalsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'Obtener todos los retiros' })
  @ApiResponse({ status: 200, description: 'Lista de retiros' })
  async findAllWithdrawals() {
    const withdrawals = await this.accountsService.findAllWithdrawals();
    return { withdrawals };
  }

  @Get(':id')
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'Obtener un retiro por ID' })
  @ApiResponse({ status: 200, description: 'Retiro encontrado' })
  @ApiResponse({ status: 404, description: 'Retiro no encontrado' })
  async findWithdrawalById(@Param('id') id: string) {
    const withdrawal = await this.accountsService.findWithdrawalById(id);
    if (!withdrawal) {
      return { message: 'Retiro no encontrado' };
    }
    return { withdrawal };
  }
}
