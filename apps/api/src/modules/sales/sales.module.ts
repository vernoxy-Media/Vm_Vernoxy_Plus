import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule, CreateNotificationUseCase } from '../notifications/public-api';
import { CalendarModule } from '../calendar/public-api';
import {
  DATA_TRANSFER_TOKENS,
  DataTransferModule,
  ExcelJsSpreadsheetAdapter,
  CsvSpreadsheetAdapter,
  FileInspectionService,
  TransferJobRepository,
} from '../data-transfer/public-api';
import { StorageModule, STORAGE_TOKENS, FileStoragePort } from '../storage/public-api';

import {
  SALES_ACCESS_POLICY_PORT_TOKEN,
} from './application/ports/sales-access-policy.port';
import {
  SALES_COMPANY_REPOSITORY_PORT_TOKEN,
  SalesCompanyRepositoryPort,
} from './application/ports/sales-company.repository.port';

import { SALES_LEAD_REPOSITORY_PORT_TOKEN, SalesLeadRepositoryPort } from './application/ports/sales-lead.repository.port';
import { SALES_NOTIFIER_PORT_TOKEN, SalesNotifierPort } from './application/ports/sales-notifier.port';
import { SALES_WORK_REPOSITORY_PORT_TOKEN, SalesWorkRepositoryPort } from './application/ports/sales-work.repository.port';
import { SALES_CONTACT_REPOSITORY_PORT_TOKEN, SalesContactRepositoryPort } from './application/ports/sales-contact.repository.port';
import { PrismaSalesWorkRepository } from './infrastructure/persistence/prisma-sales-work.repository';
import { PrismaSalesContactRepository } from './infrastructure/persistence/prisma-sales-contact.repository';
import { SALES_FOLLOW_UP_REPOSITORY_PORT_TOKEN, SalesFollowUpRepositoryPort } from './application/ports/sales-follow-up.repository.port';
import { SALES_UNIT_OF_WORK_PORT_TOKEN, SalesUnitOfWorkPort } from './application/ports/sales-unit-of-work.port';
import { SALES_CALENDAR_PORT_TOKEN, SalesCalendarPort } from './application/ports/sales-calendar.port';
import { PrismaSalesFollowUpRepository } from './infrastructure/persistence/prisma-sales-follow-up.repository';
import { PrismaSalesUnitOfWork } from './infrastructure/persistence/prisma-sales-unit-of-work';
import { CalendarSalesCalendarAdapter } from './infrastructure/adapters/calendar-sales-calendar.adapter';
import { FollowUpJobRunner } from './infrastructure/jobs/follow-up-job.runner';
import { SALES_CLIENT_REPOSITORY_PORT_TOKEN, SalesClientRepositoryPort } from './application/ports/sales-client.repository.port';
import { PrismaSalesClientRepository } from './infrastructure/persistence/prisma-sales-client.repository';
import { PrismaSalesLeadRepository } from './infrastructure/persistence/prisma-sales-lead.repository';
import { NotificationsSalesNotifierAdapter } from './infrastructure/adapters/notifications-sales-notifier.adapter';
import { PrismaSalesCompanyRepository } from './infrastructure/persistence/prisma-sales-company.repository';
import { PrismaSalesAccessPolicyAdapter } from './infrastructure/adapters/prisma-sales-access-policy.adapter';

import { SalesCompanyController } from './presentation/controllers/sales-company.controller';
import { SalesLeadController, SalesConvertToLeadController } from './presentation/controllers/sales-lead.controller';
import { SalesActivityController, SalesLeadStatusController, SalesContactController } from './presentation/controllers/sales-work.controller';
import { SalesFollowUpController } from './presentation/controllers/sales-follow-up.controller';
import { SalesJobsController } from './presentation/controllers/sales-jobs.controller';
import { CronSecretGuard } from './presentation/guards/cron-secret.guard';
import { SalesClientController } from './presentation/controllers/sales-client.controller';
import { SalesAccessGuard } from './presentation/guards/sales-access.guard';

import { CreateSalesCompanyUseCase } from './application/use-cases/create-sales-company.use-case';
import { UpdateSalesCompanyUseCase } from './application/use-cases/update-sales-company.use-case';
import { ListSalesCompaniesUseCase } from './application/use-cases/list-sales-companies.use-case';
import { GetSalesCompanyUseCase } from './application/use-cases/get-sales-company.use-case';
import { CheckSalesCompanyDuplicatesUseCase } from './application/use-cases/check-sales-company-duplicates.use-case';
import { DeleteSalesCompanyUseCase } from './application/use-cases/delete-sales-company.use-case';
import { GetSalesMastersUseCase } from './application/use-cases/get-sales-masters.use-case';
import { ConvertCompanyToLeadUseCase } from './application/use-cases/convert-company-to-lead.use-case';
import { GetLeadFormUseCase } from './application/use-cases/get-lead-form.use-case';
import { ListLeadsUseCase, GetLeadBoardUseCase } from './application/use-cases/list-leads.use-case';
import { GetLeadUseCase, GetLeadMastersUseCase } from './application/use-cases/get-lead.use-case';
import { LeadActivityUseCases } from './application/use-cases/lead-activity.use-cases';
import { LeadStatusUseCases } from './application/use-cases/lead-status.use-cases';
import { ContactUseCases } from './application/use-cases/contact.use-cases';
import { FollowUpUseCases } from './application/use-cases/follow-up.use-cases';
import { FollowUpJobs } from './application/use-cases/follow-up-jobs.use-case';
import { ClientUseCases } from './application/use-cases/client.use-cases';
import { SALES_REPORT_REPOSITORY_PORT_TOKEN, SalesReportRepositoryPort } from './application/ports/sales-report.repository.port';
import { PrismaSalesReportRepository } from './infrastructure/persistence/prisma-sales-report.repository';
import { SalesReportUseCases } from './application/use-cases/sales-report.use-cases';
import { SalesReportController } from './presentation/controllers/sales-report.controller';
import { ImportUseCases } from './application/use-cases/import.use-cases';
import { ExportUseCases } from './application/use-cases/export.use-cases';
import { SalesRightsUseCases } from './application/use-cases/rights.use-cases';
import { ListSalesCompaniesUseCase as ListCompaniesForExport } from './application/use-cases/list-sales-companies.use-case';
import { SALES_IMPORT_REPOSITORY_PORT_TOKEN, SalesImportRepositoryPort } from './application/ports/sales-import.repository.port';
import { SALES_IMPORT_TEMPLATE_PORT_TOKEN, SalesImportTemplatePort } from './application/ports/sales-import-template.port';
import { SALES_EXPORT_REPOSITORY_PORT_TOKEN, SalesExportRepositoryPort } from './application/ports/sales-export.repository.port';
import { SALES_RIGHTS_REPOSITORY_PORT_TOKEN, SalesRightsRepositoryPort } from './application/ports/sales-rights.repository.port';
import { PrismaSalesImportRepository } from './infrastructure/persistence/prisma-sales-import.repository';
import { PrismaSalesExportRepository } from './infrastructure/persistence/prisma-sales-export.repository';
import { PrismaSalesRightsRepository } from './infrastructure/persistence/prisma-sales-rights.repository';
import { ExcelJsSalesImportTemplateAdapter } from './infrastructure/adapters/exceljs-sales-import-template.adapter';
import { SalesImportExportController } from './presentation/controllers/sales-import-export.controller';

const useCase = <T>(cls: new (repo: SalesCompanyRepositoryPort) => T) => ({
  provide: cls,
  inject: [SALES_COMPANY_REPOSITORY_PORT_TOKEN],
  useFactory: (repo: SalesCompanyRepositoryPort) => new cls(repo),
});

const leadUseCase = <T>(cls: new (repo: SalesLeadRepositoryPort) => T) => ({
  provide: cls,
  inject: [SALES_LEAD_REPOSITORY_PORT_TOKEN],
  useFactory: (repo: SalesLeadRepositoryPort) => new cls(repo),
});

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule, CalendarModule, DataTransferModule, StorageModule],
  controllers: [
    SalesCompanyController,
    SalesLeadController,
    SalesConvertToLeadController,
    SalesActivityController,
    SalesLeadStatusController,
    SalesContactController,
    SalesFollowUpController,
    SalesJobsController,
    SalesClientController,
    SalesReportController,
    SalesImportExportController,
  ],
  providers: [
    { provide: SALES_COMPANY_REPOSITORY_PORT_TOKEN, useClass: PrismaSalesCompanyRepository },
    { provide: SALES_ACCESS_POLICY_PORT_TOKEN, useClass: PrismaSalesAccessPolicyAdapter },
    { provide: SALES_LEAD_REPOSITORY_PORT_TOKEN, useClass: PrismaSalesLeadRepository },
    { provide: SALES_REPORT_REPOSITORY_PORT_TOKEN, useClass: PrismaSalesReportRepository },
    {
      provide: SalesReportUseCases,
      inject: [SALES_REPORT_REPOSITORY_PORT_TOKEN],
      useFactory: (repo: SalesReportRepositoryPort) => new SalesReportUseCases(repo),
    },
    {
      provide: SALES_NOTIFIER_PORT_TOKEN,
      inject: [CreateNotificationUseCase, PrismaService],
      useFactory: (create: CreateNotificationUseCase, prisma: PrismaService) =>
        new NotificationsSalesNotifierAdapter(create, prisma),
    },
    { provide: SALES_WORK_REPOSITORY_PORT_TOKEN, useClass: PrismaSalesWorkRepository },
    { provide: SALES_CONTACT_REPOSITORY_PORT_TOKEN, useClass: PrismaSalesContactRepository },
    { provide: SALES_CLIENT_REPOSITORY_PORT_TOKEN, useClass: PrismaSalesClientRepository },
    { provide: SALES_FOLLOW_UP_REPOSITORY_PORT_TOKEN, useClass: PrismaSalesFollowUpRepository },
    { provide: SALES_UNIT_OF_WORK_PORT_TOKEN, useClass: PrismaSalesUnitOfWork },
    { provide: SALES_CALENDAR_PORT_TOKEN, useClass: CalendarSalesCalendarAdapter },
    { provide: SALES_IMPORT_REPOSITORY_PORT_TOKEN, useClass: PrismaSalesImportRepository },
    { provide: SALES_EXPORT_REPOSITORY_PORT_TOKEN, useClass: PrismaSalesExportRepository },
    { provide: SALES_RIGHTS_REPOSITORY_PORT_TOKEN, useClass: PrismaSalesRightsRepository },
    { provide: SALES_IMPORT_TEMPLATE_PORT_TOKEN, useClass: ExcelJsSalesImportTemplateAdapter },
    SalesAccessGuard,
    CronSecretGuard,
    useCase(CreateSalesCompanyUseCase),
    useCase(UpdateSalesCompanyUseCase),
    useCase(ListSalesCompaniesUseCase),
    useCase(GetSalesCompanyUseCase),
    useCase(CheckSalesCompanyDuplicatesUseCase),
    useCase(DeleteSalesCompanyUseCase),
    useCase(GetSalesMastersUseCase),
    leadUseCase(GetLeadFormUseCase),
    leadUseCase(ListLeadsUseCase),
    leadUseCase(GetLeadBoardUseCase),
    leadUseCase(GetLeadUseCase),
    leadUseCase(GetLeadMastersUseCase),
    {
      provide: LeadActivityUseCases,
      inject: [SALES_WORK_REPOSITORY_PORT_TOKEN],
      useFactory: (work: SalesWorkRepositoryPort) => new LeadActivityUseCases(work),
    },
    {
      provide: LeadStatusUseCases,
      inject: [SALES_WORK_REPOSITORY_PORT_TOKEN, SALES_LEAD_REPOSITORY_PORT_TOKEN, SALES_NOTIFIER_PORT_TOKEN],
      useFactory: (work: SalesWorkRepositoryPort, leads: SalesLeadRepositoryPort, notifier: SalesNotifierPort) =>
        new LeadStatusUseCases(work, leads, notifier),
    },
    {
      provide: FollowUpUseCases,
      inject: [
        SALES_FOLLOW_UP_REPOSITORY_PORT_TOKEN,
        SALES_WORK_REPOSITORY_PORT_TOKEN,
        LeadActivityUseCases,
        LeadStatusUseCases,
        SALES_UNIT_OF_WORK_PORT_TOKEN,
        SALES_NOTIFIER_PORT_TOKEN,
        SALES_CALENDAR_PORT_TOKEN,
      ],
      useFactory: (
        repo: SalesFollowUpRepositoryPort,
        work: SalesWorkRepositoryPort,
        activity: LeadActivityUseCases,
        status: LeadStatusUseCases,
        uow: SalesUnitOfWorkPort,
        notifier: SalesNotifierPort,
        calendar: SalesCalendarPort,
      ) => new FollowUpUseCases(repo, work, activity, status, uow, notifier, calendar),
    },
    {
      provide: ClientUseCases,
      inject: [
        SALES_CLIENT_REPOSITORY_PORT_TOKEN,
        SALES_WORK_REPOSITORY_PORT_TOKEN,
        SALES_LEAD_REPOSITORY_PORT_TOKEN,
        SALES_FOLLOW_UP_REPOSITORY_PORT_TOKEN,
        SALES_CALENDAR_PORT_TOKEN,
        SALES_NOTIFIER_PORT_TOKEN,
      ],
      useFactory: (
        repo: SalesClientRepositoryPort,
        work: SalesWorkRepositoryPort,
        leads: SalesLeadRepositoryPort,
        followUps: SalesFollowUpRepositoryPort,
        calendar: SalesCalendarPort,
        notifier: SalesNotifierPort,
      ) => new ClientUseCases(repo, work, leads, followUps, calendar, notifier),
    },
    {
      provide: FollowUpJobs,
      inject: [SALES_FOLLOW_UP_REPOSITORY_PORT_TOKEN, SALES_NOTIFIER_PORT_TOKEN, SALES_CALENDAR_PORT_TOKEN],
      useFactory: (repo: SalesFollowUpRepositoryPort, notifier: SalesNotifierPort, calendar: SalesCalendarPort) =>
        new FollowUpJobs(repo, notifier, calendar),
    },
    FollowUpJobRunner,
    {
      provide: SalesRightsUseCases,
      inject: [SALES_RIGHTS_REPOSITORY_PORT_TOKEN],
      useFactory: (repo: SalesRightsRepositoryPort) => new SalesRightsUseCases(repo),
    },
    {
      provide: ImportUseCases,
      inject: [
        SALES_IMPORT_REPOSITORY_PORT_TOKEN,
        SALES_IMPORT_TEMPLATE_PORT_TOKEN,
        DATA_TRANSFER_TOKENS.TRANSFER_JOB_REPOSITORY,
        STORAGE_TOKENS.FileStoragePort,
        FileInspectionService,
        ExcelJsSpreadsheetAdapter,
        CsvSpreadsheetAdapter,
        SALES_NOTIFIER_PORT_TOKEN,
      ],
      useFactory: (
        repo: SalesImportRepositoryPort,
        template: SalesImportTemplatePort,
        jobs: TransferJobRepository,
        storage: FileStoragePort,
        inspection: FileInspectionService,
        xlsx: ExcelJsSpreadsheetAdapter,
        csv: CsvSpreadsheetAdapter,
        notifier: SalesNotifierPort,
      ) => new ImportUseCases(repo, template, jobs, storage, inspection, { xlsx, csv }, { xlsx, csv }, notifier),
    },
    {
      provide: ExportUseCases,
      inject: [
        SALES_EXPORT_REPOSITORY_PORT_TOKEN,
        SalesRightsUseCases,
        ListCompaniesForExport,
        ListLeadsUseCase,
        FollowUpUseCases,
        DATA_TRANSFER_TOKENS.TRANSFER_JOB_REPOSITORY,
        ExcelJsSpreadsheetAdapter,
        CsvSpreadsheetAdapter,
      ],
      useFactory: (
        repo: SalesExportRepositoryPort,
        rights: SalesRightsUseCases,
        companies: ListCompaniesForExport,
        leads: ListLeadsUseCase,
        followUps: FollowUpUseCases,
        jobs: TransferJobRepository,
        xlsx: ExcelJsSpreadsheetAdapter,
        csv: CsvSpreadsheetAdapter,
      ) => new ExportUseCases(repo, rights, companies, leads, followUps, jobs, { xlsx, csv }),
    },
    {
      provide: ContactUseCases,
      inject: [SALES_CONTACT_REPOSITORY_PORT_TOKEN],
      useFactory: (repo: SalesContactRepositoryPort) => new ContactUseCases(repo),
    },
    {
      provide: ConvertCompanyToLeadUseCase,
      inject: [SALES_LEAD_REPOSITORY_PORT_TOKEN, SALES_NOTIFIER_PORT_TOKEN],
      useFactory: (repo: SalesLeadRepositoryPort, notifier: SalesNotifierPort) =>
        new ConvertCompanyToLeadUseCase(repo, notifier),
    },
  ],
})
export class SalesModule {}
