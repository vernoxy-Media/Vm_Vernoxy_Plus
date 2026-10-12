import { Injectable, Inject } from '@nestjs/common';
import { CompanyAccessPolicyPort } from '../../application/ports/access-policy.port';
import { ACCESS_POLICY_TOKEN, AccessPolicy } from '../../../auth/public-api';

@Injectable()
export class AuthCompanyAccessPolicyAdapter implements CompanyAccessPolicyPort {
  constructor(
    @Inject(ACCESS_POLICY_TOKEN)
    private readonly authAccessPolicy: AccessPolicy,
  ) {}

  async canManageCompanies(empId: number): Promise<boolean> {
    return this.authAccessPolicy.canManageCompanies(empId);
  }
}
