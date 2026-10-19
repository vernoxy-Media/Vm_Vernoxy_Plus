export class NotificationDomainError extends Error {
  constructor(message: string, public readonly code: string = 'NOTIFICATION_ERROR') {
    super(message);
    this.name = 'NotificationDomainError';
  }
}

export class NotificationNotFoundError extends NotificationDomainError {
  constructor(id: number) {
    super(`Notification #${id} not found`, 'NOTIFICATION_NOT_FOUND');
    this.name = 'NotificationNotFoundError';
  }
}
