import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './core/prisma/prisma.module';
import { PrismaService } from './core/prisma/prisma.service';
import { AppLogger } from './core/logging/logger.service';
import { HealthController } from './health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { StorageModule } from './modules/storage/public-api';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { CrmModule } from './modules/crm/crm.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    OrganizationModule,
    StorageModule,
    MasterDataModule,
    CrmModule,
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    AppLogger,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [PrismaService, AppLogger, AuthModule],
})
export class AppModule {}
