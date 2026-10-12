export const AUTH_TOKENS = {
  EmployeeAuthRepository: Symbol('EmployeeAuthRepository'),
  SessionRepository: Symbol('SessionRepository'),
  OtpRepository: Symbol('OtpRepository'),
  AuthEventRepository: Symbol('AuthEventRepository'),
  PasswordHasher: Symbol('PasswordHasher'),
  TokenService: Symbol('TokenService'),
  OtpCodeService: Symbol('OtpCodeService'),
  MailPort: Symbol('MailPort'),
  Clock: Symbol('Clock'),
} as const;
