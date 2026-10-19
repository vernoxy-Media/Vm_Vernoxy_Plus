import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAttendanceSettings,
  updateWorkingDays,
  addHoliday,
  deleteHoliday,
  updateDefaultWorkingHours,
  updateEmployeeWorkingHours,
} from '../api/attendance.api';
import type { AttendanceSettingsResponse, WorkingHoursConfig } from '../types/attendance.types';

export const ATTENDANCE_SETTINGS_QUERY_KEY = ['attendance-settings'];

export function useAttendanceSettingsQuery() {
  return useQuery<AttendanceSettingsResponse>({
    queryKey: ATTENDANCE_SETTINGS_QUERY_KEY,
    queryFn: fetchAttendanceSettings,
  });
}

export function useUpdateWorkingDaysMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workingDays: number[]) => updateWorkingDays(workingDays),
    onSuccess: (data) => {
      queryClient.setQueryData(ATTENDANCE_SETTINGS_QUERY_KEY, data);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useAddHolidayMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (holiday: { date: string; name: string; type?: string }) => addHoliday(holiday),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useDeleteHolidayMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useUpdateDefaultWorkingHoursMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hours: WorkingHoursConfig) => updateDefaultWorkingHours(hours),
    onSuccess: (data) => {
      queryClient.setQueryData(ATTENDANCE_SETTINGS_QUERY_KEY, data);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useUpdateEmployeeWorkingHoursMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      empId,
      hours,
    }: {
      empId: number;
      hours: { full_day_hours?: number; half_day_hours?: number; reset_to_default?: boolean };
    }) => updateEmployeeWorkingHours(empId, hours),
    onSuccess: (data) => {
      queryClient.setQueryData(ATTENDANCE_SETTINGS_QUERY_KEY, data);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
