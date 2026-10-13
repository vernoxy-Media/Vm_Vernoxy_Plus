import * as crypto from 'crypto';
import {
  DataTransferJob,
  ExportSource,
  TransferJobRepository,
} from '../../../data-transfer/public-api';
import { CompanyExportFilters } from '../../domain/entities/company-export-filters';

export interface ExportCompaniesInput {
  format: 'xlsx' | 'csv';
  filters: CompanyExportFilters;
  adminEmpId: number;
  outputStream: NodeJS.WritableStream;
  onClientDisconnect?: (callback: () => Promise<void>) => void;
}

export class ExportCompaniesUseCase {
  constructor(
    private readonly jobRepository: TransferJobRepository,
    private readonly exportSource: ExportSource,
  ) {}

  async execute(input: ExportCompaniesInput): Promise<{ jobId: string; filename: string }> {
    const { format, filters, adminEmpId, outputStream } = input;

    // 1. Check cap (bounded count query)
    await this.exportSource.countMatching(filters);

    // 2. Create audited export job row with status 'running'
    const now = new Date();
    const jobId = crypto.randomUUID();

    const job = new DataTransferJob({
      jobId,
      direction: 'export',
      entityType: 'companies',
      format,
      status: 'running',
      options: { filters },
      startedAt: now,
      createdBy: adminEmpId,
    });

    await this.jobRepository.create(job);

    // Safe timestamp filename: companies-YYYYMMDD-HHmm.<ext>
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = now.getFullYear();
    const MM = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const HH = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const filename = `companies-${yyyy}${MM}${dd}-${HH}${mm}.${format}`;

    let isCompleted = false;

    if (input.onClientDisconnect) {
      input.onClientDisconnect(async () => {
        if (!isCompleted) {
          await this.jobRepository.updateStatus(jobId, 'failed', {
            errorMessage: 'Client disconnected',
            finishedAt: new Date(),
          });
        }
      });
    }

    try {
      const { totalRows } = await this.exportSource.streamExport(
        job,
        format,
        filters,
        outputStream,
      );

      isCompleted = true;
      const finishedAt = new Date();
      await this.jobRepository.updateStatus(jobId, 'completed', {
        finishedAt,
      });
      await this.jobRepository.updateProgress(jobId, {
        totalRows,
        processedRows: totalRows,
      });

      return { jobId, filename };
    } catch (err: any) {
      if (!isCompleted) {
        await this.jobRepository.updateStatus(jobId, 'failed', {
          errorMessage: err.message || 'Export failed',
          finishedAt: new Date(),
        });
      }
      throw err;
    }
  }
}
