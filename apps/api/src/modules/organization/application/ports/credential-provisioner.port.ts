export interface ProvisionCredentialsDto {
  emp_id: number;
  password: string;
  must_change_password?: boolean;
  actor_emp_id: number;
}

export interface CredentialProvisionerPort {
  provision(dto: ProvisionCredentialsDto, tx: unknown): Promise<void>;
}

export const CREDENTIAL_PROVISIONER_PORT_TOKEN = Symbol('CredentialProvisionerPort');
