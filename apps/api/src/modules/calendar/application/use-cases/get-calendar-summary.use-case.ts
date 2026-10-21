import {
  CalendarRepositoryPort,
  CalendarSummaryQuery,
  CalendarSummaryResult,
} from '../../domain/ports/calendar.repository.port';

export class GetCalendarSummaryUseCase {
  constructor(private readonly calendarRepo: CalendarRepositoryPort) {}

  async execute(query: CalendarSummaryQuery): Promise<CalendarSummaryResult> {
    return this.calendarRepo.getCalendarSummary(query);
  }
}
