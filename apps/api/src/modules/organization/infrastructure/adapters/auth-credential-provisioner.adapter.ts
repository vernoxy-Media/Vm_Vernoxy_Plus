import { Injectable } from '@nestjs/common';
import {
  CredentialProvisionerPort,
  ProvisionCredentialsDto,
} from '../../application/ports/credential-provisioner.port';
import {
  provisionCredentialsInTransaction,
  Argon2PasswordHasher,
} from '../../../../modules/auth/public-api';

@Injectable()
export class AuthCredentialProvisionerAdapter implements CredentialProvisionerPort {
  private readonly passwordHasher = new Argon2PasswordHasher();

  async provision(dto: ProvisionCredentialsDto, tx: unknown): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(dto.password);
    await provisionCredentialsInTransaction({
      tx,
      empId: dto.emp_id,
      passwordHash,
      mustChangePassword: dto.must_change_password ?? false,
      actorEmpId: dto.actor_emp_id,
    });
  }
}
