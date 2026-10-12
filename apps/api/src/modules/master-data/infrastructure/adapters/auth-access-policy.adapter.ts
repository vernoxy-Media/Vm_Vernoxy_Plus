import { Injectable, Inject } from '@nestjs/common';
import { MasterDataAccessPolicyPort } from '../../application/ports/access-policy.port';
import { ACCESS_POLICY_TOKEN, AccessPolicy } from '../../../auth/public-api';

@Injectable()
export class MasterDataAuthAccessPolicyAdapter implements MasterDataAccessPolicyPort {
  constructor(
    @Inject(ACCESS_POLICY_TOKEN)
    private readonly authAccessPolicy: AccessPolicy,
  ) {}

  async canManageOrganization(empId: number): Promise<boolean> {
    return this.authAccessPolicy.canManageOrganization(empId);
  }

  async canManageCompanies(empId: number): Promise<boolean> {
    return this.authAccessPolicy.canManageCompanies(empId);
  }
}
