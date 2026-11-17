import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LicenseService } from './application/services/license.service';
import { LicenseSettingsService } from './application/services/license-settings.service';
import { LicenseBillingCycleService } from './application/services/license-billing-cycle.service';
import { LicenseReportsService } from './application/services/license-reports.service';
import { LicenseAccessService } from './application/services/license-access.service';
import { LicenseSchedulerService } from './application/services/license-scheduler.service';
import { LicenseNotifierService } from './application/services/license-notifier.service';
import { LicenseExportService } from './application/services/license-export.service';
import { LicenseController } from './presentation/controllers/license.controller';
import { LicenseSettingsController } from './presentation/controllers/license-settings.controller';
import { LicenseReportsController } from './presentation/controllers/license-reports.controller';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [
    LicenseSettingsController,
    LicenseReportsController,
    LicenseController,
  ],
  providers: [
    LicenseAccessService,
    LicenseSchedulerService,
    LicenseNotifierService,
    LicenseExportService,
    LicenseService,
    LicenseSettingsService,
    LicenseBillingCycleService,
    LicenseReportsService,
  ],
  exports: [
    LicenseAccessService,
    LicenseService,
    LicenseSettingsService,
    LicenseReportsService,
  ],
})
export class LicenseModule {}

