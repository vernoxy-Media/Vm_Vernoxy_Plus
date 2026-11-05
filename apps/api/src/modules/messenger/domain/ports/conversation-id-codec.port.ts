export const CONVERSATION_ID_CODEC = Symbol('CONVERSATION_ID_CODEC');

/**
 * Turns a conversation's database number into the opaque id people see in the address bar, and back.
 * The number itself is sequential (1, 2, 3 …), so it is never shown. Access is still decided by membership;
 * this only keeps addresses neat, private and impossible to guess.
 */
export interface ConversationIdCodecPort {
  encode(id: number): string;
  /** The database number, or null when the text is not an id this server issued. */
  decode(token: string): number | null;
}
