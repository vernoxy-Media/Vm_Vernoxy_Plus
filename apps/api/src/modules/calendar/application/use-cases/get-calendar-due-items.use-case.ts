import { CalendarDueItem, CalendarDueQuery, CalendarRepositoryPort } from '../../domain/ports/calendar.repository.port';

export class GetCalendarDueItemsUseCase {
  constructor(private readonly calendarRepo: CalendarRepositoryPort) {}

  execute(query: CalendarDueQuery): Promise<CalendarDueItem[]> {
    return this.calendarRepo.getDueItems(query);
  }
}
