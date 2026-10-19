import { Clock } from '../../domain/ports/clock.port';

export class FakeClock implements Clock {
  private currentTime: Date;

  constructor(initialTime?: Date | string) {
    this.currentTime = initialTime ? new Date(initialTime) : new Date('2026-10-16T10:00:00.000Z');
  }

  now(): Date {
    return new Date(this.currentTime.getTime());
  }

  setTime(time: Date | string): void {
    this.currentTime = new Date(time);
  }

  advanceMinutes(minutes: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + minutes * 60 * 1000);
  }

  advanceSeconds(seconds: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + seconds * 1000);
  }
}
