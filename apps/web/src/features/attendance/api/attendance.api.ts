import { customFetch } from '@vernoxy-pulse/api-client';
import type {
  AttendanceDashboardResponse,
  DayDetailResponse,
  TodayAttendanceData,
  CorrectionRequestPayload,
  AttendanceSettingsResponse,
  AttendanceHoliday,
  WorkingHoursConfig,
  AttendanceShift,
  AttendanceStatus,
} from '../types/attendance.types';
import { generateMockDashboard, getMockDayDetail, updateMockPunchAction } from './attendance.mock';

const BASE_URL = '/api/v1/attendance';

export async function fetchAttendanceDashboard(month: string): Promise<AttendanceDashboardResponse> {
  try {
    const data = await customFetch<AttendanceDashboardResponse>(`${BASE_URL}/me/dashboard?month=${month}`);
    return data;
  } catch (err: any) {
    // If backend doesn't implement /attendance yet (404/501 or network error), use realistic simulation
    if (err?.status === 404 || err?.status === 501 || err?.message?.includes('404')) {
      return generateMockDashboard(month);
    }
    throw err;
  }
}

export async function punchIn(): Promise<{ success: boolean; today: TodayAttendanceData; message?: string }> {
  try {
    const res = await customFetch<{ success: boolean; today: TodayAttendanceData; message?: string }>(
      `${BASE_URL}/me/punch-in`,
      { method: 'POST' }
    );
    return res;
  } catch (err: any) {
    if (err?.status === 409 && err?.today) {
      // 409 Conflict with server's today state
      const error: any = new Error(err.message || 'Already punched in');
      error.status = 409;
      error.today = err.today;
      throw error;
    }
    if (err?.status === 404 || err?.status === 501 || err?.message?.includes('404')) {
      return updateMockPunchAction('punch_in');
    }
    throw err;
  }
}

export async function punchOut(): Promise<{ success: boolean; today: TodayAttendanceData; message?: string }> {
  try {
    const res = await customFetch<{ success: boolean; today: TodayAttendanceData; message?: string }>(
      `${BASE_URL}/me/punch-out`,
      { method: 'POST' }
    );
    return res;
  } catch (err: any) {
    if (err?.status === 404 || err?.status === 501 || err?.message?.includes('404')) {
      return updateMockPunchAction('punch_out');
    }
    throw err;
  }
}

export async function startBreak(
  breakType?: string,
  reason?: string
): Promise<{ success: boolean; today: TodayAttendanceData; message?: string }> {
  try {
    const res = await customFetch<{ success: boolean; today: TodayAttendanceData; message?: string }>(
      `${BASE_URL}/break/start`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ break_type: breakType, reason }),
      }
    );
    return res;
  } catch (err: any) {
    if (err?.status === 404 || err?.status === 501 || err?.message?.includes('404')) {
      return updateMockPunchAction('break_start', breakType, reason);
    }
    throw err;
  }
}

export async function resumeFromBreak(): Promise<{ success: boolean; today: TodayAttendanceData; message?: string }> {
  try {
    const res = await customFetch<{ success: boolean; today: TodayAttendanceData; message?: string }>(
      `${BASE_URL}/me/resume`,
      { method: 'POST' }
    );
    return res;
  } catch (err: any) {
    if (err?.status === 404 || err?.status === 501 || err?.message?.includes('404')) {
      return updateMockPunchAction('break_end');
    }
    throw err;
  }
}

export async function fetchDayDetail(date: string): Promise<DayDetailResponse> {
  try {
    const data = await customFetch<DayDetailResponse>(`${BASE_URL}/me/days/${date}`);
    return data;
  } catch (err: any) {
    if (err?.status === 404 || err?.status === 501 || err?.message?.includes('404')) {
      return getMockDayDetail(date);
    }
    throw err;
  }
}

export async function submitCorrectionRequest(payload: CorrectionRequestPayload): Promise<{ success: boolean; message: string }> {
  try {
    const res = await customFetch<{ success: boolean; message: string }>(`${BASE_URL}/me/corrections`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  } catch (err: any) {
    if (err?.status === 404 || err?.status === 501 || err?.message?.includes('404')) {
      return { success: true, message: 'Correction request submitted successfully for approval.' };
    }
    throw err;
  }
}

// ----------------------------------------------------
// ATTENDANCE SETTINGS API
// ----------------------------------------------------

export async function fetchAttendanceSettings(): Promise<AttendanceSettingsResponse> {
  return await customFetch<AttendanceSettingsResponse>(`${BASE_URL}/settings`);
}

export async function updateWorkingDays(working_days: number[]): Promise<AttendanceSettingsResponse> {
  return await customFetch<AttendanceSettingsResponse>(`${BASE_URL}/settings/working-days`, {
    method: 'PUT',
    body: JSON.stringify({ working_days }),
  });
}

export async function addHoliday(holiday: { date: string; name: string; type?: string }): Promise<AttendanceHoliday> {
  return await customFetch<AttendanceHoliday>(`${BASE_URL}/settings/holidays`, {
    method: 'POST',
    body: JSON.stringify(holiday),
  });
}

export async function deleteHoliday(id: string): Promise<{ success: boolean }> {
  return await customFetch<{ success: boolean }>(`${BASE_URL}/settings/holidays/${id}`, {
    method: 'DELETE',
  });
}

export async function updateDefaultWorkingHours(hours: WorkingHoursConfig): Promise<AttendanceSettingsResponse> {
  return await customFetch<AttendanceSettingsResponse>(`${BASE_URL}/settings/working-hours/default`, {
    method: 'PUT',
    body: JSON.stringify(hours),
  });
}

export async function updateEmployeeWorkingHours(
  empId: number,
  payload: {
    full_day_hours?: number;
    half_day_hours?: number;
    start_time?: string;
    end_time?: string;
    reset_to_default?: boolean;
  },
): Promise<AttendanceSettingsResponse> {
  return await customFetch<AttendanceSettingsResponse>(`${BASE_URL}/settings/working-hours/employee/${empId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ----------------------------------------------------
// ATTENDANCE SHIFTS API
// ----------------------------------------------------

export async function fetchShifts(): Promise<AttendanceShift[]> {
  return await customFetch<AttendanceShift[]>(`${BASE_URL}/settings/shifts`);
}

export async function createShift(payload: Partial<AttendanceShift>): Promise<AttendanceShift> {
  return await customFetch<AttendanceShift>(`${BASE_URL}/settings/shifts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateShift(id: number, payload: Partial<AttendanceShift>): Promise<AttendanceShift> {
  return await customFetch<AttendanceShift>(`${BASE_URL}/settings/shifts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function setDefaultShift(id: number): Promise<AttendanceShift> {
  return await customFetch<AttendanceShift>(`${BASE_URL}/settings/shifts/${id}/set-default`, {
    method: 'POST',
  });
}

export async function deleteShift(id: number): Promise<{ success: boolean }> {
  return await customFetch<{ success: boolean }>(`${BASE_URL}/settings/shifts/${id}`, {
    method: 'DELETE',
  });
}

// ----------------------------------------------------
// ATTENDANCE STATUSES API
// ----------------------------------------------------

export async function fetchStatuses(): Promise<AttendanceStatus[]> {
  return await customFetch<AttendanceStatus[]>(`${BASE_URL}/settings/statuses`);
}

export async function createStatus(payload: Partial<AttendanceStatus>): Promise<AttendanceStatus> {
  return await customFetch<AttendanceStatus>(`${BASE_URL}/settings/statuses`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateStatus(id: number, payload: Partial<AttendanceStatus>): Promise<AttendanceStatus> {
  return await customFetch<AttendanceStatus>(`${BASE_URL}/settings/statuses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteStatus(id: number): Promise<{ success: boolean }> {
  return await customFetch<{ success: boolean }>(`${BASE_URL}/settings/statuses/${id}`, {
    method: 'DELETE',
  });
}

// ----------------------------------------------------
// EMPLOYEE SHIFT ASSIGNMENT API
// ----------------------------------------------------

export async function assignEmployeeShift(
  empId: number,
  shiftId: number | null,
): Promise<AttendanceSettingsResponse> {
  return await customFetch<AttendanceSettingsResponse>(`${BASE_URL}/settings/shifts/assignments/${empId}`, {
    method: 'PUT',
    body: JSON.stringify({ shift_id: shiftId }),
  });
}


