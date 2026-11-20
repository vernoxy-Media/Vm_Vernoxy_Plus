import type { Readable } from 'stream';

export const MESSENGER_FILE_STORE = Symbol('MESSENGER_FILE_STORE');

/** Keeps chat files private on disk. Files are only ever served through an authorized request. */
export interface MessengerFileStorePort {
  /** Saves the file and returns the relative path to keep in the database. */
  save(conversationId: number, originalName: string, buffer: Buffer): Promise<string>;
  /** The file's stream, or null when it is not there any more. */
  open(relativePath: string): Promise<Readable | null>;
}
