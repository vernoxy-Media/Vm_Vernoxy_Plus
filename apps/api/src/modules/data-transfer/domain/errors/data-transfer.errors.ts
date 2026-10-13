export class TransferJobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Data transfer job '${jobId}' not found`);
    this.name = 'TransferJobNotFoundError';
  }
}

export class TransferJobConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferJobConflictError';
  }
}
