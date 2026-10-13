import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  DataTransferJob,
  DataTransferJobProps,
  JobCounts,
  TransferStatus,
} from '../../domain/entities/data-transfer-job.entity';
import { TransferJobRepository } from '../../domain/ports/transfer-job.repository.port';

@Injectable()
export class PrismaTransferJobRepository implements TransferJobRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private toDomain(raw: any): DataTransferJob {
    return new DataTransferJob({
      jobId: raw.job_id,
      direction: raw.direction,
      entityType: raw.entity_type,
      format: raw.format,
      status: raw.status,
      originalFilename: raw.original_filename,
      fileKey: raw.file_key,
      fileSha256: raw.file_sha256,
      fileSizeBytes: raw.file_size_bytes ? Number(raw.file_size_bytes) : null,
      reportKey: raw.report_key,
      options: raw.options as any,
      totalRows: raw.total_rows,
      validRows: raw.valid_rows,
      warningRows: raw.warning_rows,
      errorRows: raw.error_rows,
      processedRows: raw.processed_rows,
      createdRows: raw.created_rows,
      skippedRows: raw.skipped_rows,
      failedRows: raw.failed_rows,
      errorMessage: raw.error_message,
      cancelRequested: raw.cancel_requested,
      startedAt: raw.started_at,
      finishedAt: raw.finished_at,
      heartbeatAt: raw.heartbeat_at,
      expiresAt: raw.expires_at,
      createdAt: raw.created_at,
      createdBy: raw.created_by,
      updatedAt: raw.updated_at,
      updatedBy: raw.updated_by,
      deletedAt: raw.deleted_at,
      deletedBy: raw.deleted_by,
    });
  }

  async create(job: DataTransferJob): Promise<DataTransferJob> {
    const created = await this.prisma.data_transfer_jobs.create({
      data: {
        job_id: job.jobId,
        direction: job.direction,
        entity_type: job.entityType,
        format: job.format,
        status: job.status,
        original_filename: job.originalFilename,
        file_key: job.fileKey,
        file_sha256: job.fileSha256,
        file_size_bytes: job.fileSizeBytes !== null ? BigInt(job.fileSizeBytes) : null,
        report_key: job.reportKey,
        options: job.options as any,
        total_rows: job.totalRows,
        valid_rows: job.validRows,
        warning_rows: job.warningRows,
        error_rows: job.errorRows,
        processed_rows: job.processedRows,
        created_rows: job.createdRows,
        skipped_rows: job.skippedRows,
        failed_rows: job.failedRows,
        error_message: job.errorMessage,
        cancel_requested: job.cancelRequested,
        started_at: job.startedAt,
        finished_at: job.finishedAt,
        heartbeat_at: job.heartbeatAt,
        expires_at: job.expiresAt,
        created_by: job.createdBy,
        updated_by: job.updatedBy,
      },
    });

    return this.toDomain(created);
  }

  async findById(jobId: string): Promise<DataTransferJob | null> {
    const raw = await this.prisma.data_transfer_jobs.findFirst({
      where: {
        job_id: jobId,
        deleted_at: null,
      },
    });

    return raw ? this.toDomain(raw) : null;
  }

  async update(job: DataTransferJob): Promise<void> {
    await this.prisma.data_transfer_jobs.update({
      where: { job_id: job.jobId },
      data: {
        status: job.status,
        original_filename: job.originalFilename,
        file_key: job.fileKey,
        file_sha256: job.fileSha256,
        file_size_bytes: job.fileSizeBytes !== null ? BigInt(job.fileSizeBytes) : null,
        report_key: job.reportKey,
        options: job.options as any,
        total_rows: job.totalRows,
        valid_rows: job.validRows,
        warning_rows: job.warningRows,
        error_rows: job.errorRows,
        processed_rows: job.processedRows,
        created_rows: job.createdRows,
        skipped_rows: job.skippedRows,
        failed_rows: job.failedRows,
        error_message: job.errorMessage,
        cancel_requested: job.cancelRequested,
        started_at: job.startedAt,
        finished_at: job.finishedAt,
        heartbeat_at: job.heartbeatAt,
        expires_at: job.expiresAt,
        updated_by: job.updatedBy,
      },
    });
  }

  async updateStatus(
    jobId: string,
    status: TransferStatus,
    fields?: Partial<DataTransferJobProps>,
  ): Promise<void> {
    const data: any = { status };
    if (fields) {
      if (fields.errorMessage !== undefined) data.error_message = fields.errorMessage;
      if (fields.startedAt !== undefined) data.started_at = fields.startedAt;
      if (fields.finishedAt !== undefined) data.finished_at = fields.finishedAt;
      if (fields.heartbeatAt !== undefined) data.heartbeat_at = fields.heartbeatAt;
      if (fields.reportKey !== undefined) data.report_key = fields.reportKey;
      if (fields.options !== undefined) data.options = fields.options as any;
      if (fields.updatedBy !== undefined) data.updated_by = fields.updatedBy;
    }

    await this.prisma.data_transfer_jobs.update({
      where: { job_id: jobId },
      data,
    });
  }

  async updateProgress(jobId: string, counts: Partial<JobCounts>): Promise<void> {
    const data: any = {};
    if (counts.totalRows !== undefined) data.total_rows = counts.totalRows;
    if (counts.validRows !== undefined) data.valid_rows = counts.validRows;
    if (counts.warningRows !== undefined) data.warning_rows = counts.warningRows;
    if (counts.errorRows !== undefined) data.error_rows = counts.errorRows;
    if (counts.processedRows !== undefined) data.processed_rows = counts.processedRows;
    if (counts.createdRows !== undefined) data.created_rows = counts.createdRows;
    if (counts.skippedRows !== undefined) data.skipped_rows = counts.skippedRows;
    if (counts.failedRows !== undefined) data.failed_rows = counts.failedRows;

    await this.prisma.data_transfer_jobs.update({
      where: { job_id: jobId },
      data,
    });
  }

  async updateHeartbeat(jobId: string): Promise<void> {
    await this.prisma.data_transfer_jobs.update({
      where: { job_id: jobId },
      data: { heartbeat_at: new Date() },
    });
  }

  async requestCancel(jobId: string): Promise<void> {
    await this.prisma.data_transfer_jobs.update({
      where: { job_id: jobId },
      data: { cancel_requested: true },
    });
  }

  async claimNextQueuedJob(): Promise<DataTransferJob | null> {
    // Uses SELECT ... FOR UPDATE SKIP LOCKED
    return await this.prisma.$transaction(async (tx) => {
      const rows: any[] = await tx.$queryRaw`
        SELECT * FROM data_transfer_jobs
        WHERE status = 'queued' AND deleted_at IS NULL
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
      `;

      if (!rows || rows.length === 0) {
        return null;
      }

      const job = rows[0];
      const now = new Date();

      await tx.data_transfer_jobs.update({
        where: { job_id: job.job_id },
        data: {
          status: 'running',
          started_at: now,
          heartbeat_at: now,
        },
      });

      job.status = 'running';
      job.started_at = now;
      job.heartbeat_at = now;

      return this.toDomain(job);
    });
  }

  async markStaleJobsFailed(thresholdDate: Date): Promise<number> {
    const result = await this.prisma.data_transfer_jobs.updateMany({
      where: {
        status: 'running',
        heartbeat_at: { lt: thresholdDate },
        deleted_at: null,
      },
      data: {
        status: 'failed',
        error_message: 'Interrupted',
      },
    });

    return result.count;
  }

  async findRecentJobs(
    entityType?: string,
    limit = 50,
    cursor?: string,
  ): Promise<{ jobs: DataTransferJob[]; nextCursor: string | null }> {
    const where: any = { deleted_at: null };
    if (entityType) {
      where.entity_type = entityType;
    }

    const take = limit + 1;
    const query: any = {
      where,
      orderBy: { created_at: 'desc' },
      take,
    };

    if (cursor) {
      query.cursor = { job_id: cursor };
      query.skip = 1;
    }

    const rows = await this.prisma.data_transfer_jobs.findMany(query);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].job_id : null;

    return {
      jobs: items.map((r) => this.toDomain(r)),
      nextCursor,
    };
  }
}
