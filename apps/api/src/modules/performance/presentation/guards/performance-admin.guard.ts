import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PerformanceAccessService } from '../../application/services/performance-access.service';

/** BFD Section 1: only Admin creates and changes cycles and forms. */
@Injectable()
export class PerformanceAdminGuard implements CanActivate {
  constructor(private readonly access: PerformanceAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    await this.access.assertAdmin(req.user);
    return true;
  }
}
