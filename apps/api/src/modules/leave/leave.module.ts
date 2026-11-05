import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organization/organization.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeaveService } from './application/services/leave.service';
import { LeaveCoreService } from './application/services/leave-core.service';
import { LeaveBalanceService } from './application/services/leave-balance.service';
import { LeaveNotifierService } from './application/services/leave-notifier.service';
import { LeaveSettingsService } from './application/services/leave-settings.service';
import { LeaveReportsService } from './application/services/leave-reports.service';
import { LeaveJobsService } from './application/services/leave-jobs.service';
import { LeaveController } from './presentation/controllers/leave.controller';

@Module({
  imports: [PrismaModule, AuthModule, OrganizationModule, NotificationsModule],
  controllers: [LeaveController],
  providers: [
    LeaveCoreService,
    LeaveBalanceService,
    LeaveNotifierService,
    LeaveSettingsService,
    LeaveService,
    LeaveReportsService,
    LeaveJobsService,
  ],
  exports: [LeaveService, LeaveCoreService],
})
export class LeaveModule {}
