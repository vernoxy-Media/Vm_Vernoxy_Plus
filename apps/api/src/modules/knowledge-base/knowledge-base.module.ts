import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { KbSettingsController } from './presentation/controllers/kb-settings.controller';
import { KbSettingsService } from './application/services/kb-settings.service';
import { KbArticlesController } from './presentation/controllers/kb-articles.controller';
import { KbArticlesService } from './application/services/kb-articles.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [KbSettingsController, KbArticlesController],
  providers: [KbSettingsService, KbArticlesService],
  exports: [KbSettingsService, KbArticlesService],
})
export class KnowledgeBaseModule {}
