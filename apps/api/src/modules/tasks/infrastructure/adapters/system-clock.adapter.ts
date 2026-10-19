import { Injectable } from '@nestjs/common';
import { TaskClockPort } from '../../domain/ports/clock.port';

@Injectable()
export class TaskSystemClock implements TaskClockPort {
  now(): Date {
    return new Date();
  }
}
