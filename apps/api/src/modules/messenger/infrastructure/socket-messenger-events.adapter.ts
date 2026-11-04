import { Inject, Injectable } from '@nestjs/common';
import { EventsService } from '../../websockets/public-api';
import type { MessengerEventsPort } from '../domain/ports/messenger-events.port';

@Injectable()
export class SocketMessengerEventsAdapter implements MessengerEventsPort {
  constructor(@Inject(EventsService) private readonly events: EventsService) {}

  emitToUsers(empIds: number[], event: string, payload: unknown): void {
    this.events.emitToUsers([...new Set(empIds)], event, payload);
  }

  emitToAllUsers(event: string, payload: unknown): void {
    this.events.emitToRoom('auth:users', event, payload);
  }

  isOnline(empId: number): boolean {
    return this.events.isOnline(empId);
  }

  isAway(empId: number): boolean {
    return this.events.isAway(empId);
  }

  onAwayChange(listener: (empId: number, away: boolean) => void): void {
    this.events.onAwayChange(listener);
  }

  onlineIds(): number[] {
    return this.events.onlineIds();
  }

  onPresenceChange(listener: (empId: number, online: boolean) => void): void {
    this.events.onPresenceChange(listener);
  }
}
