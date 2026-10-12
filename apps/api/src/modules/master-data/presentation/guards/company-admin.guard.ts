import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import {
  MASTER_DATA_ACCESS_POLICY_PORT_TOKEN,
  MasterDataAccessPolicyPort,
} from '../../application/ports/access-policy.port';

@Injectable()
export class CompanyAdminGuard implements CanActivate {
  constructor(
    @Inject(MASTER_DATA_ACCESS_POLICY_PORT_TOKEN)
    private readonly accessPolicy: MasterDataAccessPolicyPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user || !user.emp_id) {
      throw new ForbiddenException({
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        detail: 'Access denied: Authentication required',
      });
    }

    const canManage = await this.accessPolicy.canManageCompanies(user.emp_id);
    if (!canManage) {
      throw new ForbiddenException({
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        code: 'FORBIDDEN',
        detail: 'Access denied: Company administrator access required',
      });
    }

    return true;
  }
}
