import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Headers,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { JWT_COOKIE_NAME } from './constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ 
    summary: 'Iniciar sesión',
    description: 'Inicia sesión y establece un token JWT en una cookie httpOnly. El token se almacena de forma segura en una cookie y se envía automáticamente en las siguientes peticiones.',
  })
  @ApiResponse({ status: 200, description: 'Inicio de sesión exitoso. El token JWT se establece en una cookie httpOnly.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.authService.login(req.user, req.ip, userAgent);
    
    // Configurar cookie httpOnly con el token JWT
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
    
    res.cookie(JWT_COOKIE_NAME, result.access_token, {
      httpOnly: true,
      secure: isProduction, // Solo en HTTPS en producción
      sameSite: 'strict',
      maxAge,
      path: '/',
    });
    
    // Retornar la respuesta sin el access_token (ya está en la cookie)
    const { access_token, ...responseWithoutToken } = result;
    return responseWithoutToken;
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Verificar sesión',
    description: 'Verifica si el token JWT en la cookie httpOnly es válido. Endpoint ligero para validar la sesión del usuario.',
  })
  @ApiResponse({ status: 200, description: 'Token válido - Sesión activa' })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado - Sesión no válida' })
  async verify() {
    return {
      valid: true,
      message: 'Sesión válida',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ 
    summary: 'Cerrar sesión',
    description: 'Cierra la sesión del usuario y elimina la cookie httpOnly que contiene el token JWT.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente. La cookie ha sido eliminada.' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(JWT_COOKIE_NAME, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
    });
    
    return {
      message: 'Sesión cerrada exitosamente',
    };
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
