import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar cierre graceful para cerrar conexiones correctamente
  app.enableShutdownHooks();

  // Configurar cookie-parser para manejar cookies httpOnly
  app.use(cookieParser());

  // Obtener ConfigService para acceder a variables de entorno
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const corsOriginsEnv = configService.get<string>('CORS_ORIGINS');

  // Orígenes permitidos para CORS: si CORS_ORIGINS está definida, se usan solo esos (separados por comas)
  let allowedOrigins: string[];
  if (corsOriginsEnv?.trim()) {
    allowedOrigins = corsOriginsEnv
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  } else {
    // Valores por defecto si no se define la variable
    if (nodeEnv === 'development') {
      allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080',
      ];
    } else if (nodeEnv === 'production') {
      allowedOrigins = [
        'https://www.crocheteria.mx',
        'https://crocheteria.mx',
      ];
    } else {
      allowedOrigins = [];
    }
  }

  // Habilitar CORS: solo lista explícita de orígenes; si está vacía (ej. staging/test sin CORS_ORIGINS) no se permite ningún origen
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Prefijo global para la API
  app.setGlobalPrefix('api');

  // Interceptor de logging para ver status de respuestas
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Habilitar validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    }),
  );

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Crochetería API')
    .setDescription('API para la tienda de productos de crochet')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa tu token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Endpoints de autenticación')
    .addTag('users', 'Gestión de usuarios')
    .addTag('permissions', 'Gestión de permisos')
    .addTag('roles', 'Gestión de roles')
    .addTag('audit', 'Logs de auditoría')
    .addTag('setup', 'Configuración inicial del sistema')
    .addTag('templates', 'Templates dinámicos para el frontend')
    .addTag('product-categories', 'Gestión de categorías de productos')
    .addTag('products', 'Gestión de productos')
    .addTag('purchases', 'Gestión de compras')
    .addTag('sales', 'Gestión de ventas')
    .addTag('payments', 'Gestión de pagos')
          .addTag('cash-register', 'Control de caja de efectivo')
          .addTag('accounts', 'Gestión de apartados contables')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  console.log(`🚀 Crochetería API corriendo en: http://localhost:${port}/api`);
  console.log(`📚 Documentación Swagger: http://localhost:${port}/docs`);
}
bootstrap();
