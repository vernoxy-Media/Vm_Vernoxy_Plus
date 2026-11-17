import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationModule } from '../organization/organization.module';
import { DocumentTemplatesModule } from '../document-templates/public-api';
import { PayrollSalarySlipSource } from './application/services/salary-slip-data';
import { PayrollAccessService } from './application/services/payroll-access.service';
import { PayrollCalculationService } from './application/services/payroll-calculation.service';
import { PayrollNotifierService } from './application/services/payroll-notifier.service';
import { PayrollReportsService } from './application/services/payroll-reports.service';
import { PayrollSchedulerService } from './application/services/payroll-scheduler.service';
import { PayrollService } from './application/services/payroll.service';
import { PayrollController } from './presentation/controllers/payroll.controller';

@Module({
  imports: [PrismaModule, AuthModule, OrganizationModule, NotificationsModule, DocumentTemplatesModule],
  controllers: [PayrollController],
  providers: [
    PayrollAccessService,
    PayrollCalculationService,
    PayrollNotifierService,
    PayrollReportsService,
    PayrollSchedulerService,
    PayrollService,
    PayrollSalarySlipSource,
  ],
  exports: [PayrollService, PayrollCalculationService],
})
export class PayrollModule {}
