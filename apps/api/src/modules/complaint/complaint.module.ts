import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organization/organization.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ComplaintNotifierService } from './application/services/complaint-notifier.service';
import { ComplaintSchedulerService } from './application/services/complaint-scheduler.service';
import { ComplaintExportService } from './application/services/complaint-export.service';
import { ComplaintSettingsService } from './application/services/complaint-settings.service';
import { ComplaintSettingsController } from './presentation/controllers/complaint-settings.controller';
import { ComplaintsService } from './application/services/complaints.service';
import { ComplaintsController } from './presentation/controllers/complaints.controller';

@Module({
  imports: [PrismaModule, AuthModule, OrganizationModule, NotificationsModule],
  controllers: [ComplaintSettingsController, ComplaintsController],
  providers: [ComplaintSettingsService, ComplaintsService, ComplaintNotifierService, ComplaintSchedulerService, ComplaintExportService],
  exports: [ComplaintSettingsService, ComplaintsService],
})
export class ComplaintModule {}
