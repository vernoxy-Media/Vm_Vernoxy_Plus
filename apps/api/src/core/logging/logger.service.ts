import { Injectable, LoggerService, ConsoleLogger } from '@nestjs/common';

@Injectable()
export class AppLogger extends ConsoleLogger implements LoggerService {
  constructor(context?: string) {
    super(context || 'VernoxyPulse');
  }

  override log(message: unknown, ...optionalParams: unknown[]) {
    super.log(this.maskSecrets(message), ...optionalParams);
  }

  override error(message: unknown, stack?: string, context?: string) {
    super.error(this.maskSecrets(message), stack, context);
  }

  override warn(message: unknown, ...optionalParams: unknown[]) {
    super.warn(this.maskSecrets(message), ...optionalParams);
  }

  override debug(message: unknown, ...optionalParams: unknown[]) {
    super.debug(this.maskSecrets(message), ...optionalParams);
  }

  private maskSecrets(message: unknown): unknown {
    if (typeof message !== 'string') return message;
    // Redact connection strings / passwords
    return message.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1*****$3');
  }
}
