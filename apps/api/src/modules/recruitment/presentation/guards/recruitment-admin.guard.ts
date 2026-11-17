import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ACCESS_POLICY_TOKEN, AccessPolicy } from '../../../auth/public-api';

/**
 * BFD Recruitment & Onboarding, "Who uses it": only the Admin sees Recruitment, candidates, CTC
 * and decisions. Runs after JwtAuthGuard, so req.user is the logged-in employee.
 */
@Injectable()
export class RecruitmentAdminGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_POLICY_TOKEN)
    private readonly accessPolicy: AccessPolicy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest().user;
    const allowed = user?.emp_id ? await this.accessPolicy.canManageOrganization(user.emp_id) : false;
    if (!allowed) {
      throw new ForbiddenException({
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        code: 'FORBIDDEN',
        detail: 'Only the Admin can use Recruitment.',
      });
    }
    return true;
  }
}
