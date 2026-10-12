export interface Clock {
  now(): Date;
}

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

export interface TokenService {
  signAccessToken(payload: { emp_id: number; session_id: string }): Promise<{ token: string; expiresIn: number }>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
  getJwks(): Promise<Record<string, unknown>>;
}

export interface OtpCodeService {
  generateCode(): string;
  hashCode(otpId: string, purpose: string, code: string): string;
  verifyCode(otpId: string, purpose: string, code: string, storedHash: string): boolean;
}

export interface MailPort {
  sendOtp(to: string, code: string, purpose: 'login_2fa' | 'password_reset'): Promise<void>;
}

export interface EmployeeWithAuth {
  emp_id: number;
  name: string;
  email: string;
  mob: string | null;
  profile_picture?: string | null;
  profile_picture_url?: string | null;
  status: 'Active' | 'Inactive';
  role_id: number;
  role_name: string;
  dep_id: number;
  department_name: string;
  is_admin?: boolean;
  deleted_at: Date | null;
  credentials: {
    credential_id: number;
    password_hash: string;
    must_change_password: boolean;
    failed_attempts: number;
    locked_until: Date | null;
    last_login_at: Date | null;
  } | null;
}

export interface EmployeeAuthRepository {
  findByEmail(email: string): Promise<EmployeeWithAuth | null>;
  findById(empId: number): Promise<EmployeeWithAuth | null>;
  incrementFailedAttempts(empId: number): Promise<{ failedAttempts: number; lockedUntil: Date | null }>;
  resetFailedAttemptsAndSetLastLogin(empId: number, lastLoginAt: Date): Promise<void>;
  updatePassword(empId: number, passwordHash: string, mustChangePassword?: boolean): Promise<void>;
}

export interface SessionRecord {
  session_id: string;
  emp_id: number;
  refresh_token_hash: string;
  previous_token_hash: string | null;
  issued_at: Date;
  last_used_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  revoked_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface SessionRepository {
  createSession(data: {
    emp_id: number;
    refresh_token_hash: string;
    expires_at: Date;
    ip_address?: string | null;
    user_agent?: string | null;
    device_label?: string | null;
  }): Promise<{ session_id: string; expires_at: Date }>;
  findById(sessionId: string): Promise<SessionRecord | null>;
  findByRefreshTokenHash(hash: string): Promise<SessionRecord | null>;
  findByPreviousTokenHash(hash: string): Promise<SessionRecord | null>;
  rotateSession(sessionId: string, newHash: string, previousHash: string, lastUsedAt: Date): Promise<void>;
  revokeSession(sessionId: string, reason: string, revokedAt: Date): Promise<void>;
  revokeAllSessionsExcept(empId: number, exceptSessionId: string, reason: string, revokedAt: Date): Promise<void>;
  revokeAllSessions(empId: number, reason: string, revokedAt: Date): Promise<void>;
}

export interface OtpRecord {
  otp_id: string;
  emp_id: number;
  purpose: 'login_2fa' | 'password_reset';
  destination: string;
  code_hash: string;
  expires_at: Date;
  attempts: number;
  max_attempts: number;
  consumed_at: Date | null;
  voided_at: Date | null;
  created_at: Date;
}

export interface OtpRepository {
  findOpenCode(empId: number, purpose: string): Promise<OtpRecord | null>;
  findById(otpId: string): Promise<OtpRecord | null>;
  countCodesInLastHour(empId: number, purpose: string, since: Date): Promise<number>;
  createCode(data: {
    otp_id: string;
    emp_id: number;
    purpose: string;
    destination: string;
    code_hash: string;
    expires_at: Date;
    max_attempts: number;
    ip_address?: string | null;
  }): Promise<void>;
  replaceOpenCodeWithNew(
    oldEmpId: number,
    purpose: string,
    newCodeData: {
      otp_id: string;
      emp_id: number;
      purpose: string;
      destination: string;
      code_hash: string;
      expires_at: Date;
      max_attempts: number;
      ip_address?: string | null;
    },
    voidedAt: Date,
  ): Promise<void>;
  atomicIncrementAttempts(otpId: string, maxAttempts: number, voidIfMax: boolean, now: Date): Promise<{ attempts: number; voided: boolean }>;
  atomicConsume(otpId: string, now: Date): Promise<boolean>;
}

export interface CreateAuthEventData {
  emp_id?: number | null;
  actor_emp_id?: number | null;
  event_type: string;
  session_id?: string | null;
  identifier_hash?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  details?: Record<string, unknown> | null;
}

export interface AuthEventRepository {
  createEvent(data: CreateAuthEventData): Promise<void>;
}
