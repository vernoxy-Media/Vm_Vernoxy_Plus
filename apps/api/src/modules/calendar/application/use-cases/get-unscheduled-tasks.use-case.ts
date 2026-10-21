import { UnscheduledTaskEntity } from '../../domain/entities/calendar-event.entity';
import { CalendarRepositoryPort } from '../../domain/ports/calendar.repository.port';

export class GetUnscheduledTasksUseCase {
  constructor(private readonly calendarRepo: CalendarRepositoryPort) {}

  async execute(employeeId: number): Promise<UnscheduledTaskEntity[]> {
    return this.calendarRepo.getUnscheduledTasks(employeeId);
  }
}
