export class TransferJobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Data transfer job '${jobId}' not found`);
    this.name = 'TransferJobNotFoundError';
  }
}

export class JobExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JobExpiredError';
  }
}

export class JobStateInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JobStateInvalidError';
  }
}

export class ExportTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportTooLargeError';
  }
}
