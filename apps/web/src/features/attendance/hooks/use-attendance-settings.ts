import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAttendanceSettings,
  updateWorkingDays,
  addHoliday,
  deleteHoliday,
  updateDefaultWorkingHours,
  updateEmployeeWorkingHours,
  fetchShifts,
  createShift,
  updateShift,
  setDefaultShift,
  deleteShift,
  fetchStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  assignEmployeeShift,
} from '../api/attendance.api';
import type {
  AttendanceSettingsResponse,
  WorkingHoursConfig,
  AttendanceShift,
  AttendanceStatus,
} from '../types/attendance.types';

export const ATTENDANCE_SETTINGS_QUERY_KEY = ['attendance-settings'];
export const ATTENDANCE_SHIFTS_QUERY_KEY = ['attendance-shifts'];
export const ATTENDANCE_STATUSES_QUERY_KEY = ['attendance-statuses'];

export function useAttendanceSettingsQuery() {
  return useQuery<AttendanceSettingsResponse>({
    queryKey: ATTENDANCE_SETTINGS_QUERY_KEY,
    queryFn: fetchAttendanceSettings,
  });
}

export function useAttendanceShiftsQuery() {
  return useQuery<AttendanceShift[]>({
    queryKey: ATTENDANCE_SHIFTS_QUERY_KEY,
    queryFn: fetchShifts,
  });
}

export function useAttendanceStatusesQuery() {
  return useQuery<AttendanceStatus[]>({
    queryKey: ATTENDANCE_STATUSES_QUERY_KEY,
    queryFn: fetchStatuses,
  });
}

export function useUpdateWorkingDaysMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workingDays: number[]) => updateWorkingDays(workingDays),
    onSuccess: (data) => {
      queryClient.setQueryData(ATTENDANCE_SETTINGS_QUERY_KEY, data);
      queryClient.invalidateQueries({ queryKey: ['attendance_dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['attendance_dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['attendance_dashboard'] });
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
      hours: {
        full_day_hours?: number;
        half_day_hours?: number;
        start_time?: string;
        end_time?: string;
        reset_to_default?: boolean;
      };
    }) => updateEmployeeWorkingHours(empId, hours),
    onSuccess: (data) => {
      queryClient.setQueryData(ATTENDANCE_SETTINGS_QUERY_KEY, data);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

// ----------------------------------------------------
// SHIFTS MUTATIONS
// ----------------------------------------------------

export function useCreateShiftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shift: Partial<AttendanceShift>) => createShift(shift),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_SHIFTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useUpdateShiftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, shift }: { id: number; shift: Partial<AttendanceShift> }) => updateShift(id, shift),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_SHIFTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useSetDefaultShiftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => setDefaultShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_SHIFTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useDeleteShiftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_SHIFTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

// ----------------------------------------------------
// STATUS MUTATIONS
// ----------------------------------------------------

export function useCreateAttendanceStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: Partial<AttendanceStatus>) => createStatus(status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_STATUSES_QUERY_KEY });
    },
  });
}

export function useUpdateAttendanceStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Partial<AttendanceStatus> }) => updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_STATUSES_QUERY_KEY });
    },
  });
}

export function useDeleteAttendanceStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_STATUSES_QUERY_KEY });
    },
  });
}

// ----------------------------------------------------
// EMPLOYEE SHIFT ASSIGNMENT MUTATION
// ----------------------------------------------------

export function useAssignEmployeeShiftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empId, shiftId }: { empId: number; shiftId: number | null }) =>
      assignEmployeeShift(empId, shiftId),
    onSuccess: (data) => {
      queryClient.setQueryData(ATTENDANCE_SETTINGS_QUERY_KEY, data);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

