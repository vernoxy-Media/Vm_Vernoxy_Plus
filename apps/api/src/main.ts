import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLogger } from './core/logging/logger.service';
import { validateEnv } from './core/config/env.config';
import { configureApp } from './app-setup';

async function bootstrap() {
  const env = validateEnv();
  const logger = new AppLogger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  configureApp(app, env);
  app.enableShutdownHooks();

  const cyan = '\x1b[36m';
  const blue = '\x1b[34m';
  const bold = '\x1b[1m';
  const reset = '\x1b[0m';
  const gray = '\x1b[90m';

  await app.listen(env.PORT);
  console.log(`\n  ${cyan}➜${reset}  ${bold}Website App:${reset}  ${blue}http://localhost:5173/${reset}`);
  console.log(`  ${cyan}➜${reset}  ${bold}Backend API:${reset}  ${blue}http://localhost:${env.PORT}/api/v1${reset}`);
  console.log(`  ${cyan}➜${reset}  ${bold}Swagger Docs:${reset} ${blue}http://localhost:${env.PORT}/api/docs${reset}\n`);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
