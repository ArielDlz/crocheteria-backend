import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Inicio de sesión exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Request() req,
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.login(req.user, req.ip, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o expirado',
  })
  async getProfile(@Request() req) {
    const permissions = await this.usersService.getEffectivePermissions(
      req.user.userId,
    );
    const user = await this.usersService.findById(req.user.userId);
    const role = user?.role as any;

    return {
      message: 'Perfil del usuario',
      user: {
        id: req.user.userId,
        email: req.user.email,
        role: role
          ? {
              id: role._id,
              name: role.name,
              isSuperAdmin: role.isSuperAdmin,
            }
          : null,
      },
      permissions,
    };
  }
}
