import { CanActivate, ExecutionContext, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * Protects the job endpoint that a scheduler (Vercel Cron, a cron job, a monitor) calls.
 * Set CRON_SECRET and send it as "Authorization: Bearer <secret>" (what Vercel Cron sends) or "x-cron-secret".
 * Without CRON_SECRET the endpoint is switched off.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new ServiceUnavailableException('The job endpoint is not configured (CRON_SECRET is not set).');

    const req = context.switchToHttp().getRequest<Request>();
    const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
    const given = bearer ?? (req.headers['x-cron-secret'] as string | undefined) ?? '';

    const a = Buffer.from(given);
    const b = Buffer.from(secret);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new ForbiddenException('Invalid job secret.');
    return true;
  }
}
