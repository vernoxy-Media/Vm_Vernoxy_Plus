import * as crypto from 'crypto';
import {
  EmployeeAuthRepository,
  SessionRepository,
  OtpRepository,
  AuthEventRepository,
  TokenService,
  OtpCodeService,
  MailPort,
  Clock,
} from '../ports/auth.ports';
import { PasswordHasher } from '../../domain/ports/password-hasher.port';
import {
  generate6DigitOtp,
  maskEmail,
  isOtpExpired,
  isOtpInCooldown,
  secondsUntilCooldownExpires,
  OTP_EXPIRY_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_HOURLY_CAP,
} from '../../domain/services/otp.rules';
import {
  isAccountLocked,
  GENERIC_AUTH_ERROR_MESSAGE,
  DUMMY_ARGON2ID_HASH,
} from '../../domain/services/lockout.rules';
import {
  generateRawRefreshToken,
  hashRefreshToken,
  evaluateRefreshTokenUsage,
  RefreshTokenOutcome,
} from '../../domain/services/refresh-token.rules';
import { validatePasswordPolicy } from '../../domain/services/password-policy';
import {
  UnauthorizedAuthException,
  BadRequestAuthException,
  TooManyRequestsAuthException,
} from '../errors/auth.errors';

export interface LoginResult {
  challenge_id: string;
  masked_email: string;
  expires_in_seconds: number;
  resend_available_in_seconds: number;
  otp_code?: string;
}

export interface VerifyLoginResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  raw_refresh_token: string;
  must_change_password: boolean;
  user: {
    emp_id: number;
    name: string;
    email: string;
  };
}

export interface RefreshResult {
  access_token: string;
  expires_in: number;
  raw_refresh_token: string;
}

export interface MeResult {
  emp_id: number;
  name: string;
  email: string;
  mob: string | null;
  profile_picture_url: string | null;
  role: {
    role_id: number;
    role_name: string;
  };
  department: {
    dep_id: number;
    name: string;
  };
  must_change_password: boolean;
  access: {
    can_manage_organization: boolean;
    can_manage_companies: boolean;
    can_manage_tasks: boolean;
  };
}

export class AuthService {
  constructor(
    private readonly employeeRepo: EmployeeAuthRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly otpRepo: OtpRepository,
    private readonly authEventRepo: AuthEventRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly otpCodeService: OtpCodeService,
    private readonly mailPort: MailPort,
    private readonly clock: Clock,
  ) {}

  async login(
    email: string,
    password: string,
    clientIp?: string,
    userAgent?: string,
  ): Promise<VerifyLoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const identifierHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');

    const emp = await this.employeeRepo.findByEmail(normalizedEmail);
    console.log(`[AUTH LOGIN DEBUG] email: ${normalizedEmail}, found employee:`, emp ? { emp_id: emp.emp_id, status: emp.status, has_credentials: Boolean(emp.credentials), deleted_at: emp.deleted_at } : null);

    // Timing equalization for unknown, inactive, or soft-deleted employees
    if (!emp || emp.status !== 'Active' || emp.deleted_at !== null || !emp.credentials) {
      console.log(`[AUTH LOGIN DEBUG] Rejected at check 1: emp exists? ${Boolean(emp)}, status: ${emp?.status}, deleted_at: ${emp?.deleted_at}, credentials: ${Boolean(emp?.credentials)}`);
      await this.passwordHasher.verify(password, DUMMY_ARGON2ID_HASH);
      await this.authEventRepo.createEvent({
        identifier_hash: identifierHash,
        event_type: 'login_password_failed',
        ip_address: clientIp,
        user_agent: userAgent,
      });
      throw new UnauthorizedAuthException(GENERIC_AUTH_ERROR_MESSAGE);
    }

    // Check account lockout
    if (isAccountLocked(emp.credentials.locked_until, this.clock.now())) {
      console.log(`[AUTH LOGIN DEBUG] Account locked until: ${emp.credentials.locked_until}`);
      await this.passwordHasher.verify(password, DUMMY_ARGON2ID_HASH);
      await this.authEventRepo.createEvent({
        emp_id: emp.emp_id,
        event_type: 'login_locked',
        ip_address: clientIp,
        user_agent: userAgent,
      });
      throw new UnauthorizedAuthException(GENERIC_AUTH_ERROR_MESSAGE);
    }

    // Verify password with argon2id
    const passwordValid = await this.passwordHasher.verify(password, emp.credentials.password_hash);
    console.log(`[AUTH LOGIN DEBUG] Password check result: ${passwordValid}`);
    if (!passwordValid) {
      const incrementResult = await this.employeeRepo.incrementFailedAttempts(emp.emp_id);
      const isNowLocked = isAccountLocked(incrementResult.lockedUntil, this.clock.now());
      await this.authEventRepo.createEvent({
        emp_id: emp.emp_id,
        event_type: isNowLocked ? 'login_locked' : 'login_password_failed',
        ip_address: clientIp,
        user_agent: userAgent,
      });
      throw new UnauthorizedAuthException(GENERIC_AUTH_ERROR_MESSAGE);
    }

    // Password valid -> reset failed attempts and record last login
    await this.employeeRepo.resetFailedAttemptsAndSetLastLogin(emp.emp_id, this.clock.now());

    // Issue session directly (2FA OTP removed)
    const rawRefreshToken = generateRawRefreshToken();
    const refreshHash = hashRefreshToken(rawRefreshToken);
    const sessionExpiresAt = new Date(this.clock.now().getTime() + 7 * 86400 * 1000); // 7 days

    const session = await this.sessionRepo.createSession({
      emp_id: emp.emp_id,
      refresh_token_hash: refreshHash,
      expires_at: sessionExpiresAt,
      ip_address: clientIp,
      user_agent: userAgent,
    });

    // Issue access token
    const { token: accessToken, expiresIn } = await this.tokenService.signAccessToken({
      emp_id: emp.emp_id,
      session_id: session.session_id,
    });

    await this.authEventRepo.createEvent({
      emp_id: emp.emp_id,
      session_id: session.session_id,
      event_type: 'login_succeeded',
      ip_address: clientIp,
      user_agent: userAgent,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      raw_refresh_token: rawRefreshToken,
      must_change_password: emp.credentials?.must_change_password ?? false,
      user: {
        emp_id: emp.emp_id,
        name: emp.name,
        email: emp.email,
      },
    };
  }

  async verifyLoginOtp(
    challengeId: string,
    code: string,
    clientIp?: string,
    userAgent?: string,
  ): Promise<VerifyLoginResult> {
    const otp = await this.otpRepo.findById(challengeId);
    if (!otp || otp.purpose !== 'login_2fa' || otp.voided_at !== null || otp.consumed_at !== null || isOtpExpired(otp.expires_at, this.clock.now())) {
      await this.authEventRepo.createEvent({
        emp_id: otp?.emp_id ?? null,
        event_type: 'login_otp_failed',
        ip_address: clientIp,
        user_agent: userAgent,
      });
      throw new UnauthorizedAuthException('Invalid or expired code');
    }

    // Verify code
    const isValid = this.otpCodeService.verifyCode(otp.otp_id, otp.purpose, code, otp.code_hash);
    if (!isValid) {
      const incResult = await this.otpRepo.atomicIncrementAttempts(otp.otp_id, otp.max_attempts, true, this.clock.now());
      await this.authEventRepo.createEvent({
        emp_id: otp.emp_id,
        event_type: 'login_otp_failed',
        ip_address: clientIp,
        user_agent: userAgent,
        details: { attempts: incResult.attempts, voided: incResult.voided },
      });
      throw new UnauthorizedAuthException('Invalid or expired code');
    }

    // Atomic consume
    const consumed = await this.otpRepo.atomicConsume(otp.otp_id, this.clock.now());
    if (!consumed) {
      throw new UnauthorizedAuthException('Invalid or expired code');
    }

    // Verify employee status
    const emp = await this.employeeRepo.findById(otp.emp_id);
    if (!emp || emp.status !== 'Active' || emp.deleted_at !== null) {
      throw new UnauthorizedAuthException('Invalid or expired code');
    }

    // Issue session
    const rawRefreshToken = generateRawRefreshToken();
    const refreshHash = hashRefreshToken(rawRefreshToken);
    const sessionExpiresAt = new Date(this.clock.now().getTime() + 7 * 86400 * 1000); // 7 days

    const session = await this.sessionRepo.createSession({
      emp_id: emp.emp_id,
      refresh_token_hash: refreshHash,
      expires_at: sessionExpiresAt,
      ip_address: clientIp,
      user_agent: userAgent,
    });

    // Issue access token
    const { token: accessToken, expiresIn } = await this.tokenService.signAccessToken({
      emp_id: emp.emp_id,
      session_id: session.session_id,
    });

    await this.authEventRepo.createEvent({
      emp_id: emp.emp_id,
      session_id: session.session_id,
      event_type: 'login_succeeded',
      ip_address: clientIp,
      user_agent: userAgent,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      raw_refresh_token: rawRefreshToken,
      must_change_password: emp.credentials?.must_change_password ?? false,
      user: {
        emp_id: emp.emp_id,
        name: emp.name,
        email: emp.email,
      },
    };
  }

  async resendLoginOtp(
    challengeId: string,
    clientIp?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    const otp = await this.otpRepo.findById(challengeId);
    if (!otp || otp.purpose !== 'login_2fa') {
      throw new UnauthorizedAuthException('Invalid challenge');
    }

    // Cooldown check
    if (isOtpInCooldown(otp.created_at, this.clock.now())) {
      await this.authEventRepo.createEvent({
        emp_id: otp.emp_id,
        event_type: 'otp_resend_blocked',
        ip_address: clientIp,
        user_agent: userAgent,
        details: { reason: 'cooldown_active' },
      });
      const remaining = secondsUntilCooldownExpires(otp.created_at, this.clock.now());
      throw new TooManyRequestsAuthException(`Please wait ${remaining} seconds before requesting a new code.`);
    }

    // Hourly cap check
    const oneHourAgo = new Date(this.clock.now().getTime() - 3600_000);
    const countLastHour = await this.otpRepo.countCodesInLastHour(otp.emp_id, 'login_2fa', oneHourAgo);
    if (countLastHour >= OTP_HOURLY_CAP) {
      await this.authEventRepo.createEvent({
        emp_id: otp.emp_id,
        event_type: 'otp_resend_blocked',
        ip_address: clientIp,
        user_agent: userAgent,
        details: { reason: 'hourly_cap_exceeded' },
      });
      throw new TooManyRequestsAuthException('Too many OTP attempts. Please try again later.');
    }

    const emp = await this.employeeRepo.findById(otp.emp_id);
    if (!emp || emp.status !== 'Active' || emp.deleted_at !== null) {
      throw new UnauthorizedAuthException('Invalid challenge');
    }

    const newCode = this.otpCodeService.generateCode();
    const newOtpId = crypto.randomUUID();
    const newCodeHash = this.otpCodeService.hashCode(newOtpId, 'login_2fa', newCode);
    const expiresAt = new Date(this.clock.now().getTime() + OTP_EXPIRY_SECONDS * 1000);

    await this.otpRepo.replaceOpenCodeWithNew(
      emp.emp_id,
      'login_2fa',
      {
        otp_id: newOtpId,
        emp_id: emp.emp_id,
        purpose: 'login_2fa',
        destination: emp.email,
        code_hash: newCodeHash,
        expires_at: expiresAt,
        max_attempts: OTP_MAX_ATTEMPTS,
        ip_address: clientIp,
      },
      this.clock.now(),
    );

    await this.mailPort.sendOtp(emp.email, newCode, 'login_2fa');

    await this.authEventRepo.createEvent({
      emp_id: emp.emp_id,
      event_type: 'login_otp_sent',
      ip_address: clientIp,
      user_agent: userAgent,
    });

    return {
      challenge_id: newOtpId,
      masked_email: emp.email,
      expires_in_seconds: OTP_EXPIRY_SECONDS,
      resend_available_in_seconds: OTP_RESEND_COOLDOWN_SECONDS,
      otp_code: newCode,
    };
  }

  async refreshToken(
    rawRefreshToken: string,
    clientIp?: string,
    userAgent?: string,
  ): Promise<RefreshResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedAuthException('Refresh token missing');
    }

    const hash = hashRefreshToken(rawRefreshToken);
    const session =
      (await this.sessionRepo.findByRefreshTokenHash(hash)) ||
      (await this.sessionRepo.findByPreviousTokenHash(hash));

    if (!session) {
      throw new UnauthorizedAuthException('Invalid refresh token');
    }

    if (session.revoked_at !== null) {
      throw new UnauthorizedAuthException('Session has been revoked');
    }

    const outcome = evaluateRefreshTokenUsage({
      presentedHash: hash,
      currentHash: session.refresh_token_hash,
      previousHash: session.previous_token_hash,
      lastUsedAt: session.last_used_at,
      expiresAt: session.expires_at,
      now: this.clock.now(),
    });

    if (outcome === RefreshTokenOutcome.EXPIRED) {
      throw new UnauthorizedAuthException('Session expired');
    }

    if (outcome === RefreshTokenOutcome.PREVIOUS_REUSE_DETECTED) {
      await this.sessionRepo.revokeSession(session.session_id, 'token_reuse_detected', this.clock.now());
      await this.authEventRepo.createEvent({
        emp_id: session.emp_id,
        session_id: session.session_id,
        event_type: 'token_reuse_detected',
        ip_address: clientIp,
        user_agent: userAgent,
      });
      throw new UnauthorizedAuthException('Token reuse detected');
    }

    if (outcome === RefreshTokenOutcome.PREVIOUS_WITHIN_GRACE) {
      throw new UnauthorizedAuthException('Token recently rotated; please use updated token');
    }

    if (outcome !== RefreshTokenOutcome.VALID_CURRENT) {
      throw new UnauthorizedAuthException('Invalid refresh token');
    }

    const emp = await this.employeeRepo.findById(session.emp_id);
    if (!emp || emp.status !== 'Active' || emp.deleted_at !== null) {
      await this.sessionRepo.revokeSession(session.session_id, 'deactivated', this.clock.now());
      throw new UnauthorizedAuthException('Employee inactive');
    }

    const newRawToken = generateRawRefreshToken();
    const newHash = hashRefreshToken(newRawToken);

    await this.sessionRepo.rotateSession(session.session_id, newHash, session.refresh_token_hash, this.clock.now());

    const { token: accessToken, expiresIn } = await this.tokenService.signAccessToken({
      emp_id: session.emp_id,
      session_id: session.session_id,
    });

    await this.authEventRepo.createEvent({
      emp_id: session.emp_id,
      session_id: session.session_id,
      event_type: 'token_refreshed',
      ip_address: clientIp,
      user_agent: userAgent,
    });

    return {
      access_token: accessToken,
      expires_in: expiresIn,
      raw_refresh_token: newRawToken,
    };
  }

  async logout(
    rawRefreshToken?: string,
    sessionId?: string,
    clientIp?: string,
    userAgent?: string,
  ): Promise<void> {
    if (sessionId) {
      await this.sessionRepo.revokeSession(sessionId, 'logout', this.clock.now());
      const session = await this.sessionRepo.findById(sessionId);
      if (session) {
        await this.authEventRepo.createEvent({
          emp_id: session.emp_id,
          session_id: session.session_id,
          event_type: 'logout',
          ip_address: clientIp,
          user_agent: userAgent,
        });
      }
    } else if (rawRefreshToken) {
      const hash = hashRefreshToken(rawRefreshToken);
      const session = await this.sessionRepo.findByRefreshTokenHash(hash);
      if (session) {
        await this.sessionRepo.revokeSession(session.session_id, 'logout', this.clock.now());
        await this.authEventRepo.createEvent({
          emp_id: session.emp_id,
          session_id: session.session_id,
          event_type: 'logout',
          ip_address: clientIp,
          user_agent: userAgent,
        });
      }
    }
  }

  async logoutAll(empId: number, clientIp?: string, userAgent?: string): Promise<void> {
    await this.sessionRepo.revokeAllSessions(empId, 'logout_all', this.clock.now());
    await this.authEventRepo.createEvent({
      emp_id: empId,
      event_type: 'logout_all',
      ip_address: clientIp,
      user_agent: userAgent,
    });
  }

  async getMe(empId: number): Promise<MeResult> {
    const emp = await this.employeeRepo.findById(empId);
    if (!emp || emp.status !== 'Active' || emp.deleted_at !== null) {
      throw new UnauthorizedAuthException('Employee not found or inactive');
    }

    return {
      emp_id: emp.emp_id,
      name: emp.name,
      email: emp.email,
      mob: emp.mob,
      profile_picture_url: emp.profile_picture_url ?? null,
      role: {
        role_id: emp.role_id,
        role_name: emp.role_name,
      },
      department: {
        dep_id: emp.dep_id,
        name: emp.department_name,
      },
      must_change_password: emp.credentials?.must_change_password ?? false,
      access: {
        can_manage_organization: Boolean(emp.is_admin) && emp.status === 'Active',
        can_manage_companies: Boolean(emp.is_admin) && emp.status === 'Active',
        can_manage_tasks: Boolean(emp.is_admin) && emp.status === 'Active',
      },
    };
  }

  async changePassword(
    empId: number,
    currentSessionId: string,
    currentPass: string,
    newPass: string,
    clientIp?: string,
    userAgent?: string,
  ): Promise<void> {
    const emp = await this.employeeRepo.findById(empId);
    if (!emp || !emp.credentials) {
      throw new UnauthorizedAuthException('Employee credentials not found');
    }

    const currentValid = await this.passwordHasher.verify(currentPass, emp.credentials.password_hash);
    if (!currentValid) {
      throw new BadRequestAuthException('Current password does not match');
    }

    const policyRes = validatePasswordPolicy(newPass, { email: emp.email, name: emp.name });
    if (!policyRes.valid) {
      throw new BadRequestAuthException(policyRes.errors.join(' '));
    }

    const newHash = await this.passwordHasher.hash(newPass);
    await this.employeeRepo.updatePassword(empId, newHash, false);

    // Revoke all OTHER sessions
    await this.sessionRepo.revokeAllSessionsExcept(empId, currentSessionId, 'password_changed', this.clock.now());

    await this.authEventRepo.createEvent({
      emp_id: empId,
      session_id: currentSessionId,
      event_type: 'password_changed',
      ip_address: clientIp,
      user_agent: userAgent,
    });
  }

  async forgotPassword(
    email: string,
    clientIp?: string,
    userAgent?: string,
  ): Promise<{ message: string; otp_code?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const identifierHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');

    const emp = await this.employeeRepo.findByEmail(normalizedEmail);
    if (!emp || emp.status !== 'Active' || emp.deleted_at !== null) {
      await this.authEventRepo.createEvent({
        identifier_hash: identifierHash,
        event_type: 'password_reset_requested',
        ip_address: clientIp,
        user_agent: userAgent,
      });
      return { message: 'If the email is registered, a password reset code has been sent.' };
    }

    const oneHourAgo = new Date(this.clock.now().getTime() - 3600_000);
    const count = await this.otpRepo.countCodesInLastHour(emp.emp_id, 'password_reset', oneHourAgo);
    if (count >= OTP_HOURLY_CAP) {
      return { message: 'If the email is registered, a password reset code has been sent.' };
    }

    const code = this.otpCodeService.generateCode();
    const otpId = crypto.randomUUID();
    const codeHash = this.otpCodeService.hashCode(otpId, 'password_reset', code);
    const expiresAt = new Date(this.clock.now().getTime() + OTP_EXPIRY_SECONDS * 1000);

    await this.otpRepo.replaceOpenCodeWithNew(
      emp.emp_id,
      'password_reset',
      {
        otp_id: otpId,
        emp_id: emp.emp_id,
        purpose: 'password_reset',
        destination: emp.email,
        code_hash: codeHash,
        expires_at: expiresAt,
        max_attempts: OTP_MAX_ATTEMPTS,
        ip_address: clientIp,
      },
      this.clock.now(),
    );

    await this.mailPort.sendOtp(emp.email, code, 'password_reset');

    await this.authEventRepo.createEvent({
      emp_id: emp.emp_id,
      event_type: 'password_reset_requested',
      ip_address: clientIp,
      user_agent: userAgent,
    });

    return {
      message: 'If the email is registered, a password reset code has been sent.',
      otp_code: code,
    };
  }

  async resetPassword(
    email: string,
    code: string,
    newPass: string,
    clientIp?: string,
    userAgent?: string,
  ): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const emp = await this.employeeRepo.findByEmail(normalizedEmail);
    if (!emp || emp.status !== 'Active' || emp.deleted_at !== null) {
      throw new BadRequestAuthException('Invalid email or reset code');
    }

    const policyRes = validatePasswordPolicy(newPass, { email: emp.email, name: emp.name });
    if (!policyRes.valid) {
      throw new BadRequestAuthException(policyRes.errors.join(' '));
    }

    const otp = await this.otpRepo.findOpenCode(emp.emp_id, 'password_reset');
    if (!otp || isOtpExpired(otp.expires_at, this.clock.now())) {
      throw new BadRequestAuthException('Invalid email or reset code');
    }

    const valid = this.otpCodeService.verifyCode(otp.otp_id, 'password_reset', code, otp.code_hash);
    if (!valid) {
      await this.otpRepo.atomicIncrementAttempts(otp.otp_id, otp.max_attempts, true, this.clock.now());
      throw new BadRequestAuthException('Invalid email or reset code');
    }

    const consumed = await this.otpRepo.atomicConsume(otp.otp_id, this.clock.now());
    if (!consumed) {
      throw new BadRequestAuthException('Invalid email or reset code');
    }

    const newHash = await this.passwordHasher.hash(newPass);
    await this.employeeRepo.updatePassword(emp.emp_id, newHash, false);

    // Revoke ALL sessions
    await this.sessionRepo.revokeAllSessions(emp.emp_id, 'password_reset', this.clock.now());

    await this.authEventRepo.createEvent({
      emp_id: emp.emp_id,
      event_type: 'password_reset_completed',
      ip_address: clientIp,
      user_agent: userAgent,
    });
  }
}
