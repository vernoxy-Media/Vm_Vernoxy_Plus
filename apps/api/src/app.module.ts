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
import { DataTransferModule } from './modules/data-transfer/public-api';
import { CrmModule } from './modules/crm/crm.module';
import { AttendanceModule } from './modules/attendance/public-api';
import { NotificationsModule } from './modules/notifications/public-api';
import { TasksModule } from './modules/tasks/public-api';
import { CalendarModule } from './modules/calendar/public-api';
import { ProjectsModule } from './modules/projects/public-api';
import { WebsocketsModule } from './modules/websockets/public-api';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { LeaveModule } from './modules/leave/leave.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { ComplaintModule } from './modules/complaint/complaint.module';
import { LicenseModule } from './modules/license/license.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';

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
    DataTransferModule,
    CrmModule,
    AttendanceModule,
    NotificationsModule,
    TasksModule,
    CalendarModule,
    ProjectsModule,
    WebsocketsModule,
    RecruitmentModule,
    PayrollModule,
    LeaveModule,
    ExpenseModule,
    AttachmentsModule,
    ComplaintModule,
    LicenseModule,
    KnowledgeBaseModule,
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
