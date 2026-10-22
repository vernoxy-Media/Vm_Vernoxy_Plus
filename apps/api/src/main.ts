import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLogger } from './core/logging/logger.service';
import { validateEnv } from './core/config/env.config';
import { configureApp } from './app-setup';

async function bootstrap() {
  const env = validateEnv();
  const logger = new AppLogger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  configureApp(app, env);

  await app.listen(env.PORT);
  logger.log(`Vernoxy Pulse API is running on http://localhost:${env.PORT}/api/v1`);
  logger.log(`Swagger documentation available at http://localhost:${env.PORT}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
