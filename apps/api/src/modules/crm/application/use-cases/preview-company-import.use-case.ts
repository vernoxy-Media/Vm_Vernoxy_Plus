import * as crypto from 'crypto';
import * as path from 'path';
import {
  DataTransferJob,
  DuplicatePolicy,
  FileInspectionService,
  ImportHandler,
  JobIssue,
  JobTotals,
  TransferJobRepository,
} from '../../../data-transfer/public-api';
import { FileStoragePort, StorageValidator } from '../../../storage/public-api';

export interface PreviewCompanyImportInput {
  fileBuffer: Buffer;
  originalFilename?: string;
  duplicatePolicy?: DuplicatePolicy;
  skipInvalidRows?: boolean;
  adminEmpId: number;
}

export interface PreviewCompanyImportOutput {
  job_id: string;
  status: 'previewed';
  totals: JobTotals;
  will_create: number;
  will_skip: number;
  issues: JobIssue[];
  issues_truncated: boolean;
  can_confirm: boolean;
}

export class PreviewCompanyImportUseCase {
  constructor(
    private readonly fileInspection: FileInspectionService,
    private readonly fileStorage: FileStoragePort,
    private readonly jobRepository: TransferJobRepository,
    private readonly importHandler: ImportHandler,
  ) {}

  async execute(input: PreviewCompanyImportInput): Promise<PreviewCompanyImportOutput> {
    const { fileBuffer, originalFilename, adminEmpId } = input;
    const duplicatePolicy: DuplicatePolicy = input.duplicatePolicy || 'skip_duplicates';
    const skipInvalidRows = Boolean(input.skipInvalidRows);

    // 1. Inspect format and security limits
    const format = this.fileInspection.inspectAndDetectFormat(fileBuffer, originalFilename);

    // 2. Compute SHA-256 hash
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 3. Generate random storage key & store in imports namespace
    const fileKey = StorageValidator.generateStorageKey(format);
    const contentType =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';

    await this.fileStorage.put(fileKey, fileBuffer, contentType, 'imports');

    // Sanitize display filename (prevent path traversal or header injection)
    const sanitizedFilename = originalFilename
      ? path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255)
      : null;

    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours

    // 4. Create previewed job in database
    const initialJob = new DataTransferJob({
      jobId: crypto.randomUUID(),
      direction: 'import',
      entityType: 'companies',
      format,
      status: 'previewed',
      originalFilename: sanitizedFilename,
      fileKey,
      fileSha256: sha256,
      fileSizeBytes: fileBuffer.length,
      options: {
        duplicate_policy: duplicatePolicy,
        skip_invalid_rows: skipInvalidRows,
      },
      expiresAt,
      createdBy: adminEmpId,
    });

    const savedJob = await this.jobRepository.create(initialJob);

    // 5. Run preview validation
    const previewResult = await this.importHandler.preview(
      savedJob,
      fileBuffer,
      duplicatePolicy,
      skipInvalidRows,
    );

    // 6. Update job with counts and full stored issues
    savedJob.totalRows = previewResult.totals.total;
    savedJob.validRows = previewResult.totals.valid;
    savedJob.warningRows = previewResult.totals.warnings;
    savedJob.errorRows = previewResult.totals.errors;
    savedJob.options = {
      ...savedJob.options,
      issues: previewResult.issues,
      has_file_errors: previewResult.hasFileErrors,
      duplicates_count: previewResult.totals.duplicates,
    };

    await this.jobRepository.update(savedJob);

    return {
      job_id: savedJob.jobId,
      status: 'previewed',
      totals: previewResult.totals,
      will_create: previewResult.willCreate,
      will_skip: previewResult.willSkip,
      issues: previewResult.issues.slice(0, 200),
      issues_truncated: previewResult.issuesTruncated,
      can_confirm: previewResult.canConfirm,
    };
  }
}
