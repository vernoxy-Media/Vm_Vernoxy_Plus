import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ClientTokenService } from '../application/client-token.service';

export interface ClientIdentity {
  client_user_id: number;
  client_id: number;
  must_change_password: boolean;
}

declare global {
  namespace Express {
    interface Request {
      clientUser?: ClientIdentity;
    }
  }
}

/** Lets a signed-in client login through. Until the temporary password is changed, only the password change itself is allowed. */
@Injectable()
export class ClientAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: ClientTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) throw new UnauthorizedException('Sign in to continue.');

    const id = await this.tokens.verify(header.slice(7).trim());
    if (id === null) throw new UnauthorizedException('Your session has expired. Sign in again.');

    const user = await this.prisma.client_users.findFirst({
      where: { client_user_id: id, deleted_at: null, is_active: true },
      select: { client_user_id: true, client_id: true, must_change_password: true },
    });
    if (!user) throw new UnauthorizedException('This login is no longer active.');

    req.clientUser = user;

    if (user.must_change_password) {
      const path = req.path || req.url;
      const allowed = (req.method === 'GET' && path.endsWith('/client-portal/me')) || (req.method === 'POST' && path.endsWith('/client-portal/password/change'));
      if (!allowed) throw new ForbiddenException('Change your temporary password before you continue.');
    }
    return true;
  }
}
