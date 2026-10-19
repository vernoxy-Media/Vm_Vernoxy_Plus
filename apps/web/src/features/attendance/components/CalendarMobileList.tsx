import React from 'react';
import type { DayRecord } from '../types/attendance.types';
import { CalendarMobileDayItem } from './CalendarMobileDayItem';

export interface CalendarMobileListProps {
  daysInMonth: number;
  year: number;
  month: number;
  recordsMap: Map<string, DayRecord>;
  onSelectDate: (date: string) => void;
}

export const CalendarMobileList: React.FC<CalendarMobileListProps> = ({
  daysInMonth,
  year,
  month,
  recordsMap,
  onSelectDate,
}) => {
  return (
    <div id="mobile-calendar-list" className="md:hidden mt-4 space-y-2.5">
      {Array.from({ length: daysInMonth }).map((_, idx) => {
        const dayNum = idx + 1;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const record = recordsMap.get(dateStr);
        const isToday = Boolean(record?.is_today);
        const isMuted = record?.status === 'weekly_off' || record?.status === 'holiday';
        const cellDateObj = new Date(year, month - 1, dayNum);
        const weekdayShort = cellDateObj.toLocaleDateString('en-US', { weekday: 'short' });

        return (
          <CalendarMobileDayItem
            key={dateStr}
            dayNum={dayNum}
            dateStr={dateStr}
            record={record}
            isToday={isToday}
            isMuted={isMuted}
            weekdayShort={weekdayShort}
            onSelectDate={onSelectDate}
          />
        );
      })}
    </div>
  );
};
