import { isCommonPassword } from '../data/common-passwords';

export interface PasswordPolicyContext {
  email?: string;
  name?: string;
}

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordPolicy(
  password: string,
  context?: PasswordPolicyContext,
): PasswordPolicyResult {
  const errors: string[] = [];

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  if (context?.email && password.trim().toLowerCase() === context.email.trim().toLowerCase()) {
    errors.push('Password cannot be equal to email.');
  }

  if (context?.name && password.trim().toLowerCase() === context.name.trim().toLowerCase()) {
    errors.push('Password cannot be equal to name.');
  }

  if (isCommonPassword(password)) {
    errors.push('Password is too common and easily guessable.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
