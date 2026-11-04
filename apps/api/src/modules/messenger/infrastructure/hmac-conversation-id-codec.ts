import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import type { ConversationIdCodecPort } from '../domain/ports/conversation-id-codec.port';

const FALLBACK = 'vernoxy-pulse-messenger-id-secret-change-me';

/**
 * Public id = the number scrambled with a secret key (7 characters) + a secret-keyed check code (8 characters),
 * e.g. "0k3f8a1c9d4e2b7". Only this server can make a valid one, so addresses cannot be guessed or counted.
 */
@Injectable()
export class HmacConversationIdCodec implements ConversationIdCodecPort {
  private readonly secret = process.env.MESSENGER_ID_SECRET || process.env.FILE_URL_SECRET || FALLBACK;
  private readonly mask = createHmac('sha256', this.secret).update('conversation-mask').digest().readUInt32BE(0);
  /** An odd multiplier is reversible modulo 2^32, and spreads neighbouring numbers over the whole range. */
  private readonly mult = BigInt((createHmac('sha256', this.secret).update('conversation-mult').digest().readUInt32BE(0) | 1) >>> 0);
  private readonly inverse = HmacConversationIdCodec.modInverse(this.mult);

  private static modInverse(odd: bigint): bigint {
    const M = 1n << 32n;
    let x = odd; // each round doubles the number of correct bits
    for (let i = 0; i < 6; i++) x = (x * (2n - odd * x)) % M;
    return ((x % M) + M) % M;
  }

  private tag(scrambled: number): string {
    return createHmac('sha256', this.secret).update(`conversation:${scrambled}`).digest('hex').slice(0, 8);
  }

  encode(id: number): string {
    const scrambled = Number((BigInt((id ^ this.mask) >>> 0) * this.mult) % (1n << 32n));
    return scrambled.toString(36).padStart(7, '0') + this.tag(scrambled);
  }

  decode(token: string): number | null {
    if (!/^[0-9a-z]{7}[0-9a-f]{8}$/.test(token)) return null;
    const scrambled = parseInt(token.slice(0, 7), 36);
    if (!Number.isSafeInteger(scrambled) || scrambled > 0xffffffff) return null;
    const expected = Buffer.from(this.tag(scrambled));
    const given = Buffer.from(token.slice(7));
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const unscrambled = Number((BigInt(scrambled) * this.inverse) % (1n << 32n));
    return (unscrambled ^ this.mask) >>> 0;
  }
}
