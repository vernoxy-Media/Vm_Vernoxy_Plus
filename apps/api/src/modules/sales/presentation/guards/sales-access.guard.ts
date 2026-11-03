import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Request } from 'express';
import {
  SALES_ACCESS_POLICY_PORT_TOKEN,
  SalesAccessPolicyPort,
  SalesActor,
} from '../../application/ports/sales-access-policy.port';

export interface SalesRequest extends Request {
  salesActor?: SalesActor;
}

/** Allows Sales department employees and Admins; everyone else gets 403. Run after JwtAuthGuard. */
@Injectable()
export class SalesAccessGuard implements CanActivate {
  constructor(
    @Inject(SALES_ACCESS_POLICY_PORT_TOKEN)
    private readonly policy: SalesAccessPolicyPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SalesRequest>();
    const empId = request.user?.emp_id;
    const forbid = (detail: string) =>
      new ForbiddenException({ type: 'about:blank', title: 'Forbidden', status: 403, code: 'FORBIDDEN', detail });

    if (!empId) throw forbid('Access denied: Authentication required');

    const actor = await this.policy.getActor(empId);
    if (!actor || (!actor.is_admin && !actor.is_sales)) {
      throw forbid('Access denied: Sales team or Admin access required');
    }
    request.salesActor = actor;
    return true;
  }
}
