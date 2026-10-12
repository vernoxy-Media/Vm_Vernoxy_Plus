import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
const cookieParser = require('cookie-parser');
import * as express from 'express';
import { AppModule } from './app.module';
import { AppLogger } from './core/logging/logger.service';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';
import { createValidationException } from './core/filters/validation-exception.factory';
import { validateEnv } from './core/config/env.config';

async function bootstrap() {
  const env = validateEnv();
  const logger = new AppLogger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  (app.getHttpAdapter().getInstance() as express.Application).set('trust proxy', true);

  // Security middlewares
  app.use(helmet());
  app.use(cookieParser());
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // CORS restricted to configured WEB_ORIGIN with credentials
  app.enableCors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  // Global REST API prefix /api/v1, excluding .well-known
  app.setGlobalPrefix('api/v1', {
    exclude: ['\\.well-known/(.*)'],
  });

  // Global Validation Pipe with whitelist & forbidNonWhitelisted
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: createValidationException,
    }),
  );

  // Global RFC 7807 problem+json Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // OpenAPI 3.1 Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Vernoxy Pulse API')
    .setDescription('Sales CRM + HRMS REST API contracts')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication, 2FA OTP, and session management')
    .addTag('Health', 'System and database health check')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(env.PORT);
  logger.log(`Vernoxy Pulse API is running on http://localhost:${env.PORT}/api/v1`);
  logger.log(`Swagger documentation available at http://localhost:${env.PORT}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
