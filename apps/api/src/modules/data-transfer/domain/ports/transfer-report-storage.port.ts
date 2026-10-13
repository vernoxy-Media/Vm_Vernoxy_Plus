export interface TransferReportStoragePort {
  openReportStream(reportKey: string): Promise<NodeJS.ReadableStream>;
}
