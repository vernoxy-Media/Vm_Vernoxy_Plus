import { Inject, Injectable } from '@nestjs/common';
import { ACCESS_POLICY_TOKEN, AccessPolicy } from '../../../auth/public-api';
import { RecruitmentAccessPort } from '../../application/ports/recruitment-services.port';

/** Recruitment's view of the shared access rules: an Admin is an active employee whose role is marked Admin. */
@Injectable()
export class RecruitmentAccessAdapter implements RecruitmentAccessPort {
  constructor(@Inject(ACCESS_POLICY_TOKEN) private readonly policy: AccessPolicy) {}

  isAdmin(empId: number): Promise<boolean> {
    return this.policy.canManageOrganization(empId);
  }
}
