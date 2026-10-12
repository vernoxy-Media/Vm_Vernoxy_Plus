import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  SessionRepository,
  SessionRecord,
} from '../../application/ports/auth.ports';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async createSession(data: {
    emp_id: number;
    refresh_token_hash: string;
    expires_at: Date;
    ip_address?: string | null;
    user_agent?: string | null;
    device_label?: string | null;
  }): Promise<{ session_id: string; expires_at: Date }> {
    const session = await this.prisma.auth_sessions.create({
      data: {
        emp_id: data.emp_id,
        refresh_token_hash: data.refresh_token_hash,
        expires_at: data.expires_at,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        device_label: data.device_label,
      },
    });

    return {
      session_id: session.session_id,
      expires_at: session.expires_at,
    };
  }

  async findById(sessionId: string): Promise<SessionRecord | null> {
    const raw = await this.prisma.auth_sessions.findUnique({
      where: { session_id: sessionId },
    });
    if (!raw) return null;
    return this.mapToRecord(raw);
  }

  async findByRefreshTokenHash(hash: string): Promise<SessionRecord | null> {
    const raw = await this.prisma.auth_sessions.findUnique({
      where: { refresh_token_hash: hash },
    });
    if (!raw) return null;
    return this.mapToRecord(raw);
  }

  async findByPreviousTokenHash(hash: string): Promise<SessionRecord | null> {
    const raw = await this.prisma.auth_sessions.findFirst({
      where: { previous_token_hash: hash },
    });
    if (!raw) return null;
    return this.mapToRecord(raw);
  }

  async rotateSession(
    sessionId: string,
    newHash: string,
    previousHash: string,
    lastUsedAt: Date,
  ): Promise<void> {
    await this.prisma.auth_sessions.update({
      where: { session_id: sessionId },
      data: {
        refresh_token_hash: newHash,
        previous_token_hash: previousHash,
        last_used_at: lastUsedAt,
      },
    });
  }

  async revokeSession(sessionId: string, reason: any, revokedAt: Date): Promise<void> {
    await this.prisma.auth_sessions.update({
      where: { session_id: sessionId },
      data: {
        revoked_at: revokedAt,
        revoked_reason: reason,
      },
    });
  }

  async revokeAllSessionsExcept(
    empId: number,
    exceptSessionId: string,
    reason: any,
    revokedAt: Date,
  ): Promise<void> {
    await this.prisma.auth_sessions.updateMany({
      where: {
        emp_id: empId,
        session_id: { not: exceptSessionId },
        revoked_at: null,
        deleted_at: null,
      },
      data: {
        revoked_at: revokedAt,
        revoked_reason: reason,
      },
    });
  }

  async revokeAllSessions(empId: number, reason: any, revokedAt: Date): Promise<void> {
    await this.prisma.auth_sessions.updateMany({
      where: {
        emp_id: empId,
        revoked_at: null,
        deleted_at: null,
      },
      data: {
        revoked_at: revokedAt,
        revoked_reason: reason,
      },
    });
  }

  private mapToRecord(raw: any): SessionRecord {
    return {
      session_id: raw.session_id,
      emp_id: raw.emp_id,
      refresh_token_hash: raw.refresh_token_hash,
      previous_token_hash: raw.previous_token_hash,
      issued_at: raw.issued_at,
      last_used_at: raw.last_used_at,
      expires_at: raw.expires_at,
      revoked_at: raw.revoked_at,
      revoked_reason: raw.revoked_reason,
      ip_address: raw.ip_address,
      user_agent: raw.user_agent,
    };
  }
}
