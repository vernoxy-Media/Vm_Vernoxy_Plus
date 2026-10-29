import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
const cookieParser = require('cookie-parser');
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';
import { createValidationException } from './core/filters/validation-exception.factory';
import { EnvConfig } from './core/config/env.config';

export function configureApp(app: INestApplication, env?: EnvConfig): void {
  (app.getHttpAdapter().getInstance() as express.Application).set('trust proxy', true);

  // Security middlewares
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // CORS restricted to configured WEB_ORIGIN with credentials
  const webOrigin = env?.WEB_ORIGIN || process.env.WEB_ORIGIN;
  app.enableCors({
    origin: webOrigin ? webOrigin : true,
    credentials: true,
  });

  // Static file serving for storage attachments
  const storageCandidate1 = path.resolve(process.cwd(), 'storage');
  const storageCandidate2 = path.resolve(__dirname, '../../..', 'storage');
  const storagePath = fs.existsSync(storageCandidate1) ? storageCandidate1 : storageCandidate2;
  if (fs.existsSync(storagePath)) {
    app.use('/files', express.static(storagePath));
    app.use('/api/v1/files', express.static(storagePath));
  }

  // Global REST API prefix /api/v1, excluding .well-known and files
  app.setGlobalPrefix('api/v1', {
    exclude: ['\\.well-known/(.*)', 'files/(.*)'],
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
}
