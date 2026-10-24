import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { AUTH_TOKENS } from '../../application/ports/tokens';
import {
  TokenService,
  SessionRepository,
  EmployeeAuthRepository,
  Clock,
} from '../../application/ports/auth.ports';

export interface AuthenticatedUser {
  emp_id: number;
  session_id: string;
  name: string;
  email: string;
  role_id: number;
  role_name: string;
  dep_id: number;
  must_change_password: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH_TOKENS.TokenService)
    private readonly tokenService: TokenService,
    @Inject(AUTH_TOKENS.SessionRepository)
    private readonly sessionRepo: SessionRepository,
    @Inject(AUTH_TOKENS.EmployeeAuthRepository)
    private readonly employeeRepo: EmployeeAuthRepository,
    @Inject(AUTH_TOKENS.Clock)
    private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7).trim();
    let payload;
    try {
      payload = await this.tokenService.verifyAccessToken(token);
    } catch (err: any) {
      console.log('[JWT GUARD ERROR] verifyAccessToken failed:', err?.message || err);
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const empId = Number(payload.sub);
    const sessionId = payload.sid;

    // Load session by primary key
    const session = await this.sessionRepo.findById(sessionId);
    if (!session || session.revoked_at !== null || session.expires_at.getTime() <= this.clock.now().getTime()) {
      console.log('[JWT GUARD ERROR] session invalid:', { exists: Boolean(session), revoked: session?.revoked_at, expired: session ? session.expires_at.getTime() <= this.clock.now().getTime() : true });
      throw new UnauthorizedException('Session is revoked or expired');
    }

    // Load employee
    const emp = await this.employeeRepo.findById(empId);
    if (!emp || emp.status !== 'Active' || emp.deleted_at !== null) {
      console.log('[JWT GUARD ERROR] emp invalid:', { exists: Boolean(emp), status: emp?.status, deleted_at: emp?.deleted_at });
      throw new UnauthorizedException('Employee is inactive or not found');
    }

    const mustChangePassword = emp.credentials?.must_change_password ?? false;

    request.user = {
      emp_id: emp.emp_id,
      session_id: session.session_id,
      name: emp.name,
      email: emp.email,
      role_id: emp.role_id,
      role_name: emp.role_name,
      dep_id: emp.dep_id,
      must_change_password: mustChangePassword,
    };

    // If must_change_password is true, only allow GET /auth/me, POST /auth/password/change, and POST /auth/logout
    if (mustChangePassword) {
      const path = request.path || request.url;
      const method = request.method.toUpperCase();

      const isAllowed =
        (method === 'GET' && path.endsWith('/auth/me')) ||
        (method === 'POST' && path.endsWith('/auth/password/change')) ||
        (method === 'POST' && path.endsWith('/auth/logout'));

      if (!isAllowed) {
        throw new ForbiddenException('Password change required before accessing other endpoints');
      }
    }

    return true;
  }
}
