import { Injectable, Inject } from '@nestjs/common';
import { TransferReportStoragePort } from '../../domain/ports/transfer-report-storage.port';
import { FileStoragePort, STORAGE_TOKENS } from '../../../storage/public-api';

@Injectable()
export class StorageTransferReportAdapter implements TransferReportStoragePort {
  constructor(
    @Inject(STORAGE_TOKENS.FileStoragePort)
    private readonly fileStorage: FileStoragePort,
  ) {}

  async openReportStream(reportKey: string): Promise<NodeJS.ReadableStream> {
    return this.fileStorage.openReadStream(reportKey, 'import-reports');
  }
}
