import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  attendanceControllerGetDashboard,
  attendanceControllerPunchIn,
  attendanceControllerPunchOut,
  attendanceControllerStartBreak,
  attendanceControllerEndBreak,
  attendanceControllerGetDayDetail,
  attendanceControllerCreateCorrection,
} from '@vernoxy-pulse/api-client';
import type {
  AttendanceDashboardResponse,
  DayDetailResponse,
  TodayAttendanceData,
  CorrectionRequestPayload,
} from '../types/attendance.types';
import { startBreak } from '../api/attendance.api';

export const ATTENDANCE_QUERY_KEY = 'attendance_dashboard';
export const ATTENDANCE_DAY_QUERY_KEY = 'attendance_day_detail';

function mapApiTodayBlock(t: any): TodayAttendanceData {
  if (!t) {
    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      date: todayStr,
      company_timezone: 'Asia/Kolkata',
      state: 'not_started',
      special_status: null,
      punched_in_at: null,
      punched_out_at: null,
      worked_seconds: 0,
      break_seconds: 0,
      target_seconds: 28800,
      active_break_start: null,
      server_now: new Date().toISOString(),
      timeline: [],
    };
  }

  const specialStatus =
    t.state === 'on_leave'
      ? 'on_leave'
      : t.state === 'holiday'
      ? 'holiday'
      : t.state === 'weekly_off'
      ? 'weekly_off'
      : null;

  const timeline = (t.events || []).map((e: any, idx: number) => {
    const d = new Date(e.at);
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    let label = `Punch In at ${timeStr}`;
    if (e.type === 'punch_out') label = `Punch Out at ${timeStr}`;
    else if (e.type === 'break_start') {
      const typeStr = e.break_type || 'Break';
      const reasonStr = e.reason ? ` (${e.reason})` : '';
      label = `${typeStr} started at ${timeStr}${reasonStr}`;
    }
    else if (e.type === 'break_end') {
      const typeStr = e.break_type ? ` from ${e.break_type}` : '';
      label = `Resumed working${typeStr} at ${timeStr}`;
    }
    return {
      id: `${e.type}-${idx}`,
      type: e.type,
      timestamp: e.at,
      display_time: timeStr,
      label,
      break_type: e.break_type || null,
      reason: e.reason || null,
    };
  });

  return {
    date: t.work_date,
    company_timezone: t.timezone || 'Asia/Kolkata',
    state: t.state || 'not_started',
    special_status: specialStatus,
    punched_in_at: t.check_in_at || null,
    punched_out_at: t.check_out_at || null,
    worked_seconds: (t.worked_minutes_so_far ?? 0) * 60,
    break_seconds: (t.break_minutes_so_far ?? 0) * 60,
    target_seconds: (t.target_minutes ?? 480) * 60,
    active_break_start: t.current_break_started_at || null,
    active_break_type: t.current_break_type || null,
    active_break_reason: t.current_break_reason || null,
    server_now: t.server_now || new Date().toISOString(),
    timeline,
  };
}

function mapApiDashboardToUiModel(apiData: any): AttendanceDashboardResponse {
  const data = (apiData as any)?.data ?? apiData;
  const today = mapApiTodayBlock(data.today);

  const stats = data.stats || {};
  const monthBlock = data.month || {};
  const summary = monthBlock.summary || {};
  const rawDays = monthBlock.days || [];

  const statistics = {
    today: {
      worked_hours: Math.round(((stats.today?.worked ?? 0) / 60) * 10) / 10,
      target_hours: Math.round(((stats.today?.target ?? 480) / 60) * 10) / 10,
    },
    this_week: {
      worked_hours: Math.round(((stats.week?.worked ?? 0) / 60) * 10) / 10,
      target_hours: Math.round(((stats.week?.target ?? 2400) / 60) * 10) / 10,
    },
    this_month: {
      worked_hours: Math.round(((stats.month?.worked ?? 0) / 60) * 10) / 10,
      target_hours: Math.round(((stats.month?.target ?? 0) / 60) * 10) / 10,
    },
    remaining: {
      worked_hours: Math.round(((stats.remaining_minutes ?? 0) / 60) * 10) / 10,
      target_hours: Math.round(((stats.month?.target ?? 0) / 60) * 10) / 10,
    },
    overtime_hours: 0,
  };

  const monthSummary = {
    scheduled_days: summary.scheduled_working_days ?? 0,
    present_days: summary.days_present ?? 0,
    total_working_seconds: (summary.total_production_minutes ?? 0) * 60,
    total_break_seconds: (summary.total_break_minutes ?? 0) * 60,
    leave_days: summary.leave_days ?? 0,
    absent_days: summary.days_absent ?? 0,
    remaining_days: Math.max(0, (summary.scheduled_working_days ?? 0) - (summary.days_present ?? 0)),
  };

  const records = rawDays.map((d: any) => {
    const dateObj = new Date(d.date);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const punchIn = d.check_in_at
      ? new Date(d.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : null;
    const punchOut = d.check_out_at
      ? new Date(d.check_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : null;

    return {
      date: d.date,
      day_of_week: dayOfWeek,
      punch_in: punchIn,
      punch_out: punchOut,
      production_seconds: (d.production_minutes ?? 0) * 60,
      break_seconds: (d.break_minutes ?? 0) * 60,
      status: d.state,
      status_label: (d.state || 'not_started').replace('_', ' ').toUpperCase(),
      holiday_name: d.holiday_name || null,
      leave_type: d.leave?.type_name || null,
      can_request_correction: d.date <= today.date,
      is_today: d.date === today.date,
    };
  });

  return {
    today,
    statistics,
    month_summary: monthSummary,
    records,
  };
}

export function useAttendanceDashboard(month: string) {
  return useQuery<AttendanceDashboardResponse>({
    queryKey: [ATTENDANCE_QUERY_KEY, month],
    queryFn: async () => {
      const res = await attendanceControllerGetDashboard({ month });
      return mapApiDashboardToUiModel(res);
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useDayDetail(date: string | null) {
  return useQuery<DayDetailResponse>({
    queryKey: [ATTENDANCE_DAY_QUERY_KEY, date],
    queryFn: async () => {
      const res = await attendanceControllerGetDayDetail(date!);
      const detail = (res as any)?.data ?? res;
      return {
        date: detail.work_date,
        status: detail.day_status as any,
        status_label: (detail.day_status || 'present').replace('_', ' ').toUpperCase(),
        punched_in_at: detail.check_in_at || null,
        punched_out_at: detail.check_out_at || null,
        production_seconds: (detail.production_minutes ?? 0) * 60,
        break_seconds: (detail.break_minutes ?? 0) * 60,
        timeline: (detail.events || detail.timeline || []).map((e: any, idx: number) => {
          const d = new Date(e.at);
          const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          let label = `${e.type.replace('_', ' ')} at ${timeStr}`;
          if (e.type === 'break_start') {
            const typeStr = e.break_type || 'Break';
            const reasonStr = e.reason ? ` (${e.reason})` : '';
            label = `${typeStr} started at ${timeStr}${reasonStr}`;
          } else if (e.type === 'break_end') {
            const typeStr = e.break_type ? ` from ${e.break_type}` : '';
            label = `Resumed working${typeStr} at ${timeStr}`;
          }
          return {
            id: `${e.type}-${idx}`,
            type: e.type,
            timestamp: e.at,
            display_time: timeStr,
            label,
            break_type: e.break_type || null,
            reason: e.reason || null,
          };
        }),
        breaks: (detail.breaks || []).map((b: any) => ({
          start: b.started_at,
          end: b.ended_at || null,
          duration_seconds: (b.break_minutes ?? 0) * 60,
        })),
        can_request_correction: true,
      };
    },
    enabled: Boolean(date),
    retry: false,
    staleTime: 60 * 1000,
  });
}

interface PunchMutationOptions {
  month: string;
  onConflict?: (message: string, resyncedToday: TodayAttendanceData) => void;
  onAnnounce?: (announcement: string) => void;
}

export function usePunchActions({ month, onConflict, onAnnounce }: PunchMutationOptions) {
  const queryClient = useQueryClient();

  const updateTodayData = (rawToday: any) => {
    const newToday = mapApiTodayBlock(rawToday);
    queryClient.setQueryData<AttendanceDashboardResponse>(
      [ATTENDANCE_QUERY_KEY, month],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          today: newToday,
        };
      }
    );
    queryClient.invalidateQueries({ queryKey: [ATTENDANCE_QUERY_KEY] });
  };

  const handleConflict = (err: any) => {
    if (err?.status === 409 && err?.today) {
      updateTodayData(err.today);
      onConflict?.(err.message || 'Already synchronized', mapApiTodayBlock(err.today));
      return true;
    }
    return false;
  };

  const punchInMutation = useMutation({
    mutationFn: async () => {
      const res = await attendanceControllerPunchIn();
      return (res as any)?.data ?? res;
    },
    onSuccess: (data) => {
      updateTodayData(data);
      const timeStr = data.check_in_at
        ? new Date(data.check_in_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'now';
      onAnnounce?.(`Punched in at ${timeStr}`);
    },
    onError: (err: any) => {
      handleConflict(err);
    },
  });

  const punchOutMutation = useMutation({
    mutationFn: async () => {
      const res = await attendanceControllerPunchOut();
      return (res as any)?.data ?? res;
    },
    onSuccess: (data) => {
      updateTodayData(data);
      const hrs = Math.floor((data.worked_minutes_so_far ?? 0) / 60);
      const mins = (data.worked_minutes_so_far ?? 0) % 60;
      onAnnounce?.(`Punched out, production ${hrs} hours ${mins} minutes`);
    },
    onError: (err: any) => {
      handleConflict(err);
    },
  });

  const startBreakMutation = useMutation({
    mutationFn: async (variables?: { breakType?: string; reason?: string }) => {
      try {
        const res = await startBreak(variables?.breakType, variables?.reason);
        return (res as any)?.today ?? (res as any)?.data ?? res;
      } catch (err) {
        const res = await attendanceControllerStartBreak({
          break_type: variables?.breakType as any,
          reason: variables?.reason,
        });
        return (res as any)?.data ?? res;
      }
    },
    onSuccess: (data, variables) => {
      updateTodayData(data);
      onAnnounce?.(`${variables?.breakType || 'Break'} started`);
    },
    onError: (err: any) => {
      handleConflict(err);
    },
  });

  const resumeBreakMutation = useMutation({
    mutationFn: async () => {
      const res = await attendanceControllerEndBreak();
      return (res as any)?.data ?? res;
    },
    onSuccess: (data) => {
      updateTodayData(data);
      onAnnounce?.('Break ended');
    },
    onError: (err: any) => {
      handleConflict(err);
    },
  });

  const isPending =
    punchInMutation.isPending ||
    punchOutMutation.isPending ||
    startBreakMutation.isPending ||
    resumeBreakMutation.isPending;

  return {
    punchInMutation,
    punchOutMutation,
    startBreakMutation,
    resumeBreakMutation,
    isPending,
  };
}

export function useSubmitCorrection(onSuccessCallback?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CorrectionRequestPayload) => {
      const requestedCheckIn = `${payload.date}T${payload.punch_in}:00`;
      const requestedCheckOut = `${payload.date}T${payload.punch_out}:00`;
      const res = await attendanceControllerCreateCorrection({
        work_date: payload.date,
        requested_check_in_at: new Date(requestedCheckIn).toISOString(),
        requested_check_out_at: new Date(requestedCheckOut).toISOString(),
        requested_break_minutes: payload.break_minutes,
        reason: payload.reason,
      });
      return (res as any)?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ATTENDANCE_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ATTENDANCE_DAY_QUERY_KEY] });
      onSuccessCallback?.();
    },
  });
}
