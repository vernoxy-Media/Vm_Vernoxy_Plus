import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ACCESS_POLICY_TOKEN, AccessPolicy } from '../../../auth/public-api';

/** Template Management is for the Admin only. Runs after JwtAuthGuard. */
@Injectable()
export class TemplateAdminGuard implements CanActivate {
  constructor(@Inject(ACCESS_POLICY_TOKEN) private readonly accessPolicy: AccessPolicy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest().user;
    const allowed = user?.emp_id ? await this.accessPolicy.canManageOrganization(Number(user.emp_id)) : false;
    if (!allowed) {
      throw new ForbiddenException({
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        code: 'FORBIDDEN',
        detail: 'Only the Admin can manage document templates.',
      });
    }
    return true;
  }
}
