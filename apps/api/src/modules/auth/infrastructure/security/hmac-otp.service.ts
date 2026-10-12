import { Injectable, Optional, Inject } from '@nestjs/common';
import { OtpCodeService } from '../../application/ports/auth.ports';
import {
  generate6DigitOtp,
  computeOtpHash,
  verifyOtpHash,
} from '../../domain/services/otp.rules';

@Injectable()
export class HmacOtpService implements OtpCodeService {
  private readonly secret: string;

  constructor(@Optional() @Inject('HMAC_SECRET') secret?: string) {
    this.secret = secret || process.env.OTP_HMAC_SECRET || '';
    if (!this.secret || this.secret.length < 32) {
      throw new Error('OTP_HMAC_SECRET must be configured with at least 32 characters');
    }
  }

  generateCode(): string {
    return generate6DigitOtp();
  }

  hashCode(otpId: string, purpose: string, code: string): string {
    return computeOtpHash(this.secret, otpId, purpose, code);
  }

  verifyCode(otpId: string, purpose: string, code: string, storedHash: string): boolean {
    return verifyOtpHash(this.secret, otpId, purpose, code, storedHash);
  }
}
