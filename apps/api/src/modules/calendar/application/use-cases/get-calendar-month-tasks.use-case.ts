import {
  CalendarMonthTaskItem,
  CalendarMonthTasksQuery,
  CalendarRepositoryPort,
} from '../../domain/ports/calendar.repository.port';

export class GetCalendarMonthTasksUseCase {
  constructor(private readonly calendarRepo: CalendarRepositoryPort) {}

  async execute(query: CalendarMonthTasksQuery): Promise<CalendarMonthTaskItem[]> {
    return this.calendarRepo.getMonthTasks(query);
  }
}
