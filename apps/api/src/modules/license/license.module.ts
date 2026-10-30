import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { LicenseService } from './application/services/license.service';
import { LicenseSettingsService } from './application/services/license-settings.service';
import { LicenseReportsService } from './application/services/license-reports.service';
import { LicenseController } from './presentation/controllers/license.controller';
import { LicenseSettingsController } from './presentation/controllers/license-settings.controller';
import { LicenseReportsController } from './presentation/controllers/license-reports.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    LicenseSettingsController,
    LicenseReportsController,
    LicenseController,
  ],
  providers: [
    LicenseService,
    LicenseSettingsService,
    LicenseReportsService,
  ],
  exports: [
    LicenseService,
    LicenseSettingsService,
    LicenseReportsService,
  ],
})
export class LicenseModule {}

