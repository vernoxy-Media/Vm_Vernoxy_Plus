import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationModule } from '../organization/organization.module';
import { PayrollModule } from '../payroll/payroll.module';
import { ExpenseAccessService } from './application/services/expense-access.service';
import { ExpenseClaimsService } from './application/services/expense-claims.service';
import { ExpenseExportService } from './application/services/expense-export.service';
import { ExpenseNotifierService } from './application/services/expense-notifier.service';
import { ExpenseSchedulerService } from './application/services/expense-scheduler.service';
import { ExpenseSettingsService } from './application/services/expense-settings.service';
import { ExpenseClaimsController } from './presentation/controllers/expense-claims.controller';
import { ExpenseSettingsController } from './presentation/controllers/expense-settings.controller';

@Module({
  imports: [PrismaModule, AuthModule, OrganizationModule, NotificationsModule, PayrollModule],
  controllers: [ExpenseSettingsController, ExpenseClaimsController],
  providers: [
    ExpenseAccessService,
    ExpenseNotifierService,
    ExpenseExportService,
    ExpenseSettingsService,
    ExpenseClaimsService,
    ExpenseSchedulerService,
  ],
  exports: [ExpenseSettingsService, ExpenseClaimsService],
})
export class ExpenseModule implements OnModuleInit {
  constructor(
    private readonly settings: ExpenseSettingsService,
    private readonly scheduler: ExpenseSchedulerService,
  ) {}

  /** Approver changes in Expense Settings move claims that are waiting (BFD 12). */
  onModuleInit() {
    this.settings.reassignHook = (actorId: number) => this.scheduler.reassignWaitingClaims(actorId);
  }
}
