import { Injectable, Inject } from '@nestjs/common';
import { AccessPolicyPort } from '../../application/ports/access-policy.port';
import { ACCESS_POLICY_TOKEN, AccessPolicy } from '../../../../modules/auth/public-api';

@Injectable()
export class AuthAccessPolicyAdapter implements AccessPolicyPort {
  constructor(
    @Inject(ACCESS_POLICY_TOKEN)
    private readonly authAccessPolicy: AccessPolicy,
  ) {}

  async canManageOrganization(empId: number): Promise<boolean> {
    return this.authAccessPolicy.canManageOrganization(empId);
  }
}
