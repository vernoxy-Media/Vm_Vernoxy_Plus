export interface JobQueuePort {
  enqueue(jobId: string): Promise<void>;
  startWorker(): Promise<void>;
  stopWorker(): Promise<void>;
  isWorkerRunning(): boolean;
}
