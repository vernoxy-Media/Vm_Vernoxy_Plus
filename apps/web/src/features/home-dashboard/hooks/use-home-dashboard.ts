import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import { fetchCalendarHolidays } from '@/features/calendar/api/calendar.api';
import type { HomeDashboardData } from '../types';

/** VM-004 rule 5: birthdays in the next 10 days. */
export const BIRTHDAY_WINDOW_DAYS = 10;

export interface UpcomingBirthday {
  emp_id: number;
  name: string;
  photo_url: string | null;
  date: string;
  days_until: number;
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * The dashboard data. One request: every section is already scoped on the server, so a section that is missing here
 * is one the person has no access to. Re-read when the window regains focus (VM-004 rule 9: latest data on load/refresh).
 */
export function useHomeDashboard() {
  return useQuery({
    queryKey: ['home-dashboard'],
    queryFn: () => customFetch<HomeDashboardData>('/api/v1/home-dashboard'),
    staleTime: 60_000,
  });
}

/** Reuses the Attendance birthdays endpoint with the dashboard's 10-day window. */
export function useUpcomingBirthdays() {
  return useQuery({
    queryKey: ['birthdays', BIRTHDAY_WINDOW_DAYS],
    queryFn: () => customFetch<UpcomingBirthday[]>(`/api/v1/attendance/birthdays?days=${BIRTHDAY_WINDOW_DAYS}`),
    staleTime: 5 * 60_000,
  });
}

/**
 * Office holidays from today to the end of next year, from the Calendar holidays endpoint (VM-004 rule 6: the card is
 * hidden only when no future holiday is scheduled, including next calendar year).
 */
export function useOfficeHolidays() {
  const today = ymd(new Date());
  const end = `${new Date().getFullYear() + 1}-12-31`;
  return useQuery({
    queryKey: ['dashboard-holidays', today],
    queryFn: () => fetchCalendarHolidays(today, end),
    staleTime: 30 * 60_000,
  });
}
