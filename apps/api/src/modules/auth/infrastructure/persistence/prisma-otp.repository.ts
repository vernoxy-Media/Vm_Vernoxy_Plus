import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  OtpRepository,
  OtpRecord,
} from '../../application/ports/auth.ports';

@Injectable()
export class PrismaOtpRepository implements OtpRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async findOpenCode(empId: number, purpose: string): Promise<OtpRecord | null> {
    const raw = await this.prisma.otp_codes.findFirst({
      where: {
        emp_id: empId,
        purpose: purpose as any,
        consumed_at: null,
        voided_at: null,
        deleted_at: null,
      },
    });

    if (!raw) return null;
    return this.mapToRecord(raw);
  }

  async findById(otpId: string): Promise<OtpRecord | null> {
    const raw = await this.prisma.otp_codes.findUnique({
      where: { otp_id: otpId },
    });

    if (!raw) return null;
    return this.mapToRecord(raw);
  }

  async countCodesInLastHour(empId: number, purpose: string, since: Date): Promise<number> {
    return this.prisma.otp_codes.count({
      where: {
        emp_id: empId,
        purpose: purpose as any,
        created_at: { gte: since },
        deleted_at: null,
      },
    });
  }

  async createCode(data: {
    otp_id: string;
    emp_id: number;
    purpose: string;
    destination: string;
    code_hash: string;
    expires_at: Date;
    max_attempts: number;
    ip_address?: string | null;
  }): Promise<void> {
    await this.prisma.otp_codes.create({
      data: {
        otp_id: data.otp_id,
        emp_id: data.emp_id,
        purpose: data.purpose as any,
        destination: data.destination,
        code_hash: data.code_hash,
        expires_at: data.expires_at,
        max_attempts: data.max_attempts,
        ip_address: data.ip_address,
      },
    });
  }

  async replaceOpenCodeWithNew(
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
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Void any open code in the same transaction
      await tx.$executeRaw`
        UPDATE otp_codes
        SET voided_at = ${voidedAt},
            updated_at = NOW()
        WHERE emp_id = ${oldEmpId}
          AND purpose = ${purpose}::otp_purpose
          AND consumed_at IS NULL
          AND voided_at IS NULL
          AND deleted_at IS NULL;
      `;

      // 2. Insert the new code
      await tx.$executeRaw`
        INSERT INTO otp_codes (
          otp_id,
          emp_id,
          purpose,
          destination,
          code_hash,
          expires_at,
          max_attempts,
          ip_address
        ) VALUES (
          ${newCodeData.otp_id}::uuid,
          ${newCodeData.emp_id},
          ${newCodeData.purpose}::otp_purpose,
          ${newCodeData.destination},
          ${newCodeData.code_hash},
          ${newCodeData.expires_at},
          ${newCodeData.max_attempts},
          ${newCodeData.ip_address}
        );
      `;
    });
  }

  async atomicIncrementAttempts(
    otpId: string,
    maxAttempts: number,
    voidIfMax: boolean,
    now: Date,
  ): Promise<{ attempts: number; voided: boolean }> {
    const result: any[] = await this.prisma.$queryRaw`
      UPDATE otp_codes
      SET attempts = attempts + 1,
          voided_at = CASE WHEN attempts + 1 >= max_attempts THEN ${now}::timestamptz ELSE voided_at END,
          updated_at = NOW()
      WHERE otp_id = ${otpId}::uuid
        AND attempts < max_attempts
        AND consumed_at IS NULL
        AND voided_at IS NULL
      RETURNING attempts, max_attempts, voided_at;
    `;

    if (!result || result.length === 0) {
      return { attempts: maxAttempts, voided: true };
    }

    const row = result[0];
    return {
      attempts: row.attempts,
      voided: row.voided_at !== null,
    };
  }

  async atomicConsume(otpId: string, now: Date): Promise<boolean> {
    const result: any[] = await this.prisma.$queryRaw`
      UPDATE otp_codes
      SET consumed_at = ${now}::timestamptz,
          updated_at = NOW()
      WHERE otp_id = ${otpId}::uuid
        AND consumed_at IS NULL
        AND voided_at IS NULL
        AND attempts < max_attempts
      RETURNING otp_id;
    `;

    return Boolean(result && result.length > 0);
  }

  private mapToRecord(raw: any): OtpRecord {
    return {
      otp_id: raw.otp_id,
      emp_id: raw.emp_id,
      purpose: raw.purpose,
      destination: raw.destination,
      code_hash: raw.code_hash,
      expires_at: raw.expires_at,
      attempts: raw.attempts,
      max_attempts: raw.max_attempts,
      consumed_at: raw.consumed_at,
      voided_at: raw.voided_at,
      created_at: raw.created_at,
    };
  }
}
