export const MESSENGER_EVENTS = Symbol('MESSENGER_EVENTS');

/** Pushes real time updates to connected employees. */
export interface MessengerEventsPort {
  emitToUsers(empIds: number[], event: string, payload: unknown): void;
  emitToAllUsers(event: string, payload: unknown): void;
  isOnline(empId: number): boolean;
  isAway(empId: number): boolean;
  onlineIds(): number[];
  onPresenceChange(listener: (empId: number, online: boolean) => void): void;
  onAwayChange(listener: (empId: number, away: boolean) => void): void;
}
