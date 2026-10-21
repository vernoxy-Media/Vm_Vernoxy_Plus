import {
  CalendarHolidayItem,
  CalendarRepositoryPort,
} from '../../domain/ports/calendar.repository.port';

export class GetCalendarHolidaysUseCase {
  constructor(private readonly calendarRepo: CalendarRepositoryPort) {}

  async execute(startDate: string, endDate: string): Promise<CalendarHolidayItem[]> {
    return this.calendarRepo.getHolidays(startDate, endDate);
  }
}
