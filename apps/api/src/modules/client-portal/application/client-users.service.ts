import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AppLogger } from '../../../core/logging/logger.service';
import { Argon2PasswordHasher } from '../../auth/public-api';
import { AUTH_TOKENS } from '../../auth/application/ports/tokens';
import type { MailPort } from '../../auth/application/ports/auth.ports';
import { ClientTokenService } from './client-token.service';
import {
  LOCK_MINUTES,
  MAX_FAILED_ATTEMPTS,
  MAX_RESET_ATTEMPTS,
  RESET_CODE_MINUTES,
  generateTemporaryPassword,
  hashResetCode,
  normalizeEmail,
  passwordProblem,
  sameHash,
} from '../domain/client-rules';
import * as crypto from 'crypto';

export interface ClientLoginView {
  client_user_id: number;
  client_id: number;
  client_name: string;
  name: string;
  email: string;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface ClientSession {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  must_change_password: boolean;
  user: { client_user_id: number; name: string; email: string; client_id: number; client_name: string };
}

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';

/** Client logins: created and reset by an Admin, used by the client to sign in and look after their own password. */
@Injectable()
export class ClientUsersService {
  private readonly log = new AppLogger('ClientUsers');
  private readonly hasher = new Argon2PasswordHasher();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: ClientTokenService,
    @Inject(AUTH_TOKENS.MailPort) private readonly mail: MailPort,
  ) {}

  // ───────────────────────── admin ─────────────────────────

  async isAdmin(empId: number): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ ok: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM employees e JOIN roles r ON r.role_id = e.role_id
        WHERE e.emp_id = ${empId} AND r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL
      ) AS ok;
    `;
    return Boolean(rows[0]?.ok);
  }

  async list(clientId?: number): Promise<ClientLoginView[]> {
    const rows = await this.prisma.$queryRaw<Array<ClientLoginRow>>`
      SELECT u.client_user_id, u.client_id, co.name AS client_name, u.name, u.email, u.is_active, u.must_change_password, u.last_login_at, u.created_at
        FROM client_users u
        JOIN clients c ON c.client_id = u.client_id
        JOIN companies co ON co.company_id = c.company_id
       WHERE u.deleted_at IS NULL AND (${clientId ?? null}::int IS NULL OR u.client_id = ${clientId ?? null}::int)
       ORDER BY co.name, u.name;
    `;
    return rows.map(toView);
  }

  /** The temporary password is returned this once; only its hash is kept. */
  async create(adminEmpId: number, input: { client_id: number; name: string; email: string }): Promise<ClientLoginView & { temporary_password: string }> {
    const email = normalizeEmail(input.email);
    const name = input.name.trim();
    if (!name) throw new BadRequestException('Enter the name of the person.');
    const client = await this.prisma.clients.findFirst({ where: { client_id: input.client_id, deleted_at: null }, select: { client_id: true } });
    if (!client) throw new NotFoundException('Client not found.');
    const taken = await this.prisma.client_users.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, deleted_at: null }, select: { client_user_id: true } });
    if (taken) throw new ConflictException('A client login with this email already exists.');

    const temporary = generateTemporaryPassword();
    const row = await this.prisma.client_users.create({
      data: { client_id: input.client_id, name, email, password_hash: await this.hasher.hash(temporary), must_change_password: true, created_by: adminEmpId },
      select: { client_user_id: true },
    });
    this.log.log(`Client login #${row.client_user_id} created by employee #${adminEmpId}`);
    const [view] = await this.viewOf(row.client_user_id);
    return { ...view!, temporary_password: temporary };
  }

  async resetPassword(adminEmpId: number, clientUserId: number): Promise<ClientLoginView & { temporary_password: string }> {
    await this.mustExist(clientUserId);
    const temporary = generateTemporaryPassword();
    await this.prisma.client_users.update({
      where: { client_user_id: clientUserId },
      data: {
        password_hash: await this.hasher.hash(temporary),
        must_change_password: true,
        failed_attempts: 0,
        locked_until: null,
        reset_code_hash: null,
        reset_expires_at: null,
        updated_by: adminEmpId,
        updated_at: new Date(),
      },
    });
    this.log.log(`Client login #${clientUserId} password reset by employee #${adminEmpId}`);
    const [view] = await this.viewOf(clientUserId);
    return { ...view!, temporary_password: temporary };
  }

  async setActive(adminEmpId: number, clientUserId: number, isActive: boolean): Promise<ClientLoginView> {
    await this.mustExist(clientUserId);
    await this.prisma.client_users.update({ where: { client_user_id: clientUserId }, data: { is_active: isActive, updated_by: adminEmpId, updated_at: new Date() } });
    return (await this.viewOf(clientUserId))[0]!;
  }

  // ───────────────────────── the client ─────────────────────────

  async login(emailInput: string, password: string): Promise<ClientSession> {
    const email = normalizeEmail(emailInput);
    const user = await this.prisma.client_users.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, deleted_at: null } });
    if (!user || !user.is_active) {
      await this.hasher.verify(password, DUMMY_HASH); // same time as a real check
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }
    if (user.locked_until && user.locked_until.getTime() > Date.now()) {
      throw new ForbiddenException(`Too many wrong passwords. Try again in ${LOCK_MINUTES} minutes, or ask your contact to reset it.`);
    }
    if (!(await this.hasher.verify(password, user.password_hash))) {
      const failed = user.failed_attempts + 1;
      await this.prisma.client_users.update({
        where: { client_user_id: user.client_user_id },
        data: { failed_attempts: failed >= MAX_FAILED_ATTEMPTS ? 0 : failed, locked_until: failed >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null },
      });
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }
    await this.prisma.client_users.update({ where: { client_user_id: user.client_user_id }, data: { failed_attempts: 0, locked_until: null, last_login_at: new Date() } });
    return this.session(user.client_user_id, user.must_change_password);
  }

  async profile(clientUserId: number) {
    const [v] = await this.viewOf(clientUserId);
    if (!v) throw new UnauthorizedException();
    return { client_user_id: v.client_user_id, name: v.name, email: v.email, client_id: v.client_id, client_name: v.client_name, must_change_password: v.must_change_password };
  }

  async changePassword(clientUserId: number, current: string, next: string): Promise<void> {
    const user = await this.prisma.client_users.findFirst({ where: { client_user_id: clientUserId, deleted_at: null } });
    if (!user) throw new UnauthorizedException();
    if (!(await this.hasher.verify(current, user.password_hash))) throw new BadRequestException('The current password is not correct.');
    if (current === next) throw new BadRequestException('Choose a password that is different from the current one.');
    const problem = passwordProblem(next);
    if (problem) throw new BadRequestException(problem);
    await this.prisma.client_users.update({ where: { client_user_id: clientUserId }, data: { password_hash: await this.hasher.hash(next), must_change_password: false, updated_at: new Date() } });
  }

  /** Always answers the same, so nobody can find out which emails have a login. */
  async forgotPassword(emailInput: string): Promise<void> {
    const user = await this.prisma.client_users.findFirst({ where: { email: { equals: normalizeEmail(emailInput), mode: 'insensitive' }, deleted_at: null, is_active: true } });
    if (!user) return;
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.client_users.update({
      where: { client_user_id: user.client_user_id },
      data: { reset_code_hash: hashResetCode(secret(), user.client_user_id, code), reset_expires_at: new Date(Date.now() + RESET_CODE_MINUTES * 60_000), reset_attempts: 0 },
    });
    try {
      await this.mail.sendOtp(user.email, code, 'password_reset');
    } catch (err) {
      this.log.error(`Could not email the reset code to client login #${user.client_user_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async resetPasswordWithCode(emailInput: string, code: string, next: string): Promise<void> {
    const bad = new BadRequestException('The email or the code is not correct, or the code has expired.');
    const user = await this.prisma.client_users.findFirst({ where: { email: { equals: normalizeEmail(emailInput), mode: 'insensitive' }, deleted_at: null, is_active: true } });
    if (!user || !user.reset_code_hash || !user.reset_expires_at || user.reset_expires_at.getTime() < Date.now() || user.reset_attempts >= MAX_RESET_ATTEMPTS) throw bad;
    if (!sameHash(user.reset_code_hash, hashResetCode(secret(), user.client_user_id, code.trim()))) {
      await this.prisma.client_users.update({ where: { client_user_id: user.client_user_id }, data: { reset_attempts: user.reset_attempts + 1 } });
      throw bad;
    }
    const problem = passwordProblem(next);
    if (problem) throw new BadRequestException(problem);
    await this.prisma.client_users.update({
      where: { client_user_id: user.client_user_id },
      data: { password_hash: await this.hasher.hash(next), must_change_password: false, reset_code_hash: null, reset_expires_at: null, reset_attempts: 0, failed_attempts: 0, locked_until: null, updated_at: new Date() },
    });
  }

  // ───────────────────────── helpers ─────────────────────────

  private async session(clientUserId: number, mustChange: boolean): Promise<ClientSession> {
    const { token, expiresIn } = await this.tokens.sign(clientUserId);
    const [v] = await this.viewOf(clientUserId);
    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: expiresIn,
      must_change_password: mustChange,
      user: { client_user_id: v!.client_user_id, name: v!.name, email: v!.email, client_id: v!.client_id, client_name: v!.client_name },
    };
  }

  private async mustExist(id: number) {
    const u = await this.prisma.client_users.findFirst({ where: { client_user_id: id, deleted_at: null }, select: { client_user_id: true } });
    if (!u) throw new NotFoundException('Client login not found.');
  }

  private async viewOf(id: number): Promise<ClientLoginView[]> {
    const rows = await this.prisma.$queryRaw<Array<ClientLoginRow>>`
      SELECT u.client_user_id, u.client_id, co.name AS client_name, u.name, u.email, u.is_active, u.must_change_password, u.last_login_at, u.created_at
        FROM client_users u JOIN clients c ON c.client_id = u.client_id JOIN companies co ON co.company_id = c.company_id
       WHERE u.client_user_id = ${id} AND u.deleted_at IS NULL;
    `;
    return rows.map(toView);
  }
}

interface ClientLoginRow {
  client_user_id: number;
  client_id: number;
  client_name: string;
  name: string;
  email: string;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: Date | null;
  created_at: Date;
}

const toView = (r: ClientLoginRow): ClientLoginView => ({
  ...r,
  last_login_at: r.last_login_at ? r.last_login_at.toISOString() : null,
  created_at: r.created_at.toISOString(),
});

const secret = () => process.env.OTP_HMAC_SECRET || '';

// A valid argon2id hash of a random string, used only to spend the same time when the email is unknown
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$4pSnHoOf3zrVuuLVCZS1FrNc0cN7b8wH0Uy5kM2ZpoE';
