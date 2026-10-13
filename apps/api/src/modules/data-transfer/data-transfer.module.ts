import { Module } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { StorageModule } from '../storage/public-api';
import { AuthModule } from '../auth/auth.module';
import { DATA_TRANSFER_TOKENS } from './domain/ports/tokens';
import { TransferJobRepository } from './domain/ports/transfer-job.repository.port';
import { TransferReportStoragePort } from './domain/ports/transfer-report-storage.port';
import { DataTransferRegistry } from './domain/services/data-transfer-registry';
import { PrismaTransferJobRepository } from './infrastructure/repositories/prisma-transfer-job.repository';
import { DbJobQueue } from './infrastructure/queue/db-job-queue.service';
import { BullMqJobQueueStub } from './infrastructure/queue/bullmq-job-queue.stub';
import { ExcelJsSpreadsheetAdapter } from './infrastructure/spreadsheet/exceljs-spreadsheet.adapter';
import { CsvSpreadsheetAdapter } from './infrastructure/spreadsheet/csv-spreadsheet.adapter';
import { FileInspectionService } from './infrastructure/security/file-inspection.service';
import { AuthUserAuthorizationAdapter } from './infrastructure/adapters/auth-user-authorization.adapter';
import { StorageTransferReportAdapter } from './infrastructure/adapters/storage-transfer-report.adapter';
import { GetTransferJobUseCase } from './application/use-cases/get-transfer-job.use-case';
import { GetTransferJobIssuesUseCase } from './application/use-cases/get-transfer-job-issues.use-case';
import { ListTransferJobsUseCase } from './application/use-cases/list-transfer-jobs.use-case';
import { CancelTransferJobUseCase } from './application/use-cases/cancel-transfer-job.use-case';
import { DownloadTransferReportUseCase } from './application/use-cases/download-transfer-report.use-case';

@Module({
  imports: [StorageModule, AuthModule],
  providers: [
    PrismaService,
    DataTransferRegistry,
    FileInspectionService,
    ExcelJsSpreadsheetAdapter,
    CsvSpreadsheetAdapter,
    BullMqJobQueueStub,
    AuthUserAuthorizationAdapter,
    StorageTransferReportAdapter,
    {
      provide: DATA_TRANSFER_TOKENS.TRANSFER_JOB_REPOSITORY,
      useClass: PrismaTransferJobRepository,
    },
    {
      provide: DATA_TRANSFER_TOKENS.SPREADSHEET_WRITER,
      useClass: ExcelJsSpreadsheetAdapter,
    },
    {
      provide: DATA_TRANSFER_TOKENS.SPREADSHEET_READER,
      useClass: ExcelJsSpreadsheetAdapter,
    },
    {
      provide: DATA_TRANSFER_TOKENS.USER_AUTHORIZATION,
      useClass: AuthUserAuthorizationAdapter,
    },
    {
      provide: DATA_TRANSFER_TOKENS.TRANSFER_REPORT_STORAGE,
      useClass: StorageTransferReportAdapter,
    },
    DbJobQueue,
    {
      provide: DATA_TRANSFER_TOKENS.JOB_QUEUE,
      useExisting: DbJobQueue,
    },
    {
      provide: GetTransferJobUseCase,
      useFactory: (repo: TransferJobRepository) => new GetTransferJobUseCase(repo),
      inject: [DATA_TRANSFER_TOKENS.TRANSFER_JOB_REPOSITORY],
    },
    {
      provide: GetTransferJobIssuesUseCase,
      useFactory: (repo: TransferJobRepository) => new GetTransferJobIssuesUseCase(repo),
      inject: [DATA_TRANSFER_TOKENS.TRANSFER_JOB_REPOSITORY],
    },
    {
      provide: ListTransferJobsUseCase,
      useFactory: (repo: TransferJobRepository) => new ListTransferJobsUseCase(repo),
      inject: [DATA_TRANSFER_TOKENS.TRANSFER_JOB_REPOSITORY],
    },
    {
      provide: CancelTransferJobUseCase,
      useFactory: (repo: TransferJobRepository) => new CancelTransferJobUseCase(repo),
      inject: [DATA_TRANSFER_TOKENS.TRANSFER_JOB_REPOSITORY],
    },
    {
      provide: DownloadTransferReportUseCase,
      useFactory: (repo: TransferJobRepository, storage: TransferReportStoragePort) =>
        new DownloadTransferReportUseCase(repo, storage),
      inject: [
        DATA_TRANSFER_TOKENS.TRANSFER_JOB_REPOSITORY,
        DATA_TRANSFER_TOKENS.TRANSFER_REPORT_STORAGE,
      ],
    },
  ],
  exports: [
    DATA_TRANSFER_TOKENS.TRANSFER_JOB_REPOSITORY,
    DATA_TRANSFER_TOKENS.JOB_QUEUE,
    DATA_TRANSFER_TOKENS.SPREADSHEET_WRITER,
    DATA_TRANSFER_TOKENS.SPREADSHEET_READER,
    DATA_TRANSFER_TOKENS.USER_AUTHORIZATION,
    DATA_TRANSFER_TOKENS.TRANSFER_REPORT_STORAGE,
    DataTransferRegistry,
    FileInspectionService,
    ExcelJsSpreadsheetAdapter,
    CsvSpreadsheetAdapter,
    DbJobQueue,
    GetTransferJobUseCase,
    GetTransferJobIssuesUseCase,
    ListTransferJobsUseCase,
    CancelTransferJobUseCase,
    DownloadTransferReportUseCase,
  ],
})
export class DataTransferModule {}
