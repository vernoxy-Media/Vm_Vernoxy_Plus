import { Injectable, Inject } from '@nestjs/common';
import { ACCESS_POLICY_TOKEN, AccessPolicy } from '../../../auth/public-api';
import { UserAuthorizationPort } from '../../domain/ports/user-authorization.port';

@Injectable()
export class AuthUserAuthorizationAdapter implements UserAuthorizationPort {
  constructor(
    @Inject(ACCESS_POLICY_TOKEN)
    private readonly accessPolicy: AccessPolicy,
  ) {}

  async isUserAuthorizedToManage(empId: number, entityType: string): Promise<boolean> {
    if (entityType === 'companies') {
      return this.accessPolicy.canManageCompanies(empId);
    }
    return false;
  }
}
