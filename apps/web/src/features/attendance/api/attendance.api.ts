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
  AttendanceRegularization,
  CreateRegularizationPayload,
  RegularizationFilterParams,
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

// ----------------------------------------------------
// ATTENDANCE REGULARIZATION API
// ----------------------------------------------------

export async function fetchRegularizations(
  params: RegularizationFilterParams = {},
): Promise<AttendanceRegularization[]> {
  const query = new URLSearchParams();
  if (params.tab) query.append('tab', params.tab);
  if (params.status) query.append('status', params.status);
  if (params.department_id) query.append('department_id', String(params.department_id));
  if (params.request_type) query.append('request_type', params.request_type);
  if (params.from_date) query.append('from_date', params.from_date);
  if (params.to_date) query.append('to_date', params.to_date);
  if (params.search) query.append('search', params.search);
  if (params.scope) query.append('scope', params.scope);

  const qs = query.toString();
  return await customFetch<AttendanceRegularization[]>(
    `${BASE_URL}/regularizations${qs ? `?${qs}` : ''}`
  );
}

export async function fetchRegularizationDetail(
  id: number,
): Promise<AttendanceRegularization> {
  return await customFetch<AttendanceRegularization>(`${BASE_URL}/regularizations/${id}`);
}

export async function createRegularizationRequest(
  payload: CreateRegularizationPayload,
): Promise<AttendanceRegularization> {
  return await customFetch<AttendanceRegularization>(`${BASE_URL}/regularizations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function cancelRegularizationRequest(
  id: number,
): Promise<AttendanceRegularization> {
  return await customFetch<AttendanceRegularization>(`${BASE_URL}/regularizations/${id}/cancel`, {
    method: 'POST',
  });
}

export async function approveRegularizationRequest(
  id: number,
  comment?: string,
): Promise<AttendanceRegularization> {
  return await customFetch<AttendanceRegularization>(`${BASE_URL}/regularizations/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function rejectRegularizationRequest(
  id: number,
  comment: string,
): Promise<AttendanceRegularization> {
  return await customFetch<AttendanceRegularization>(`${BASE_URL}/regularizations/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function bulkApproveRegularizationRequests(
  ids: number[],
): Promise<{ successCount: number; failedCount: number }> {
  return await customFetch<{ successCount: number; failedCount: number }>(
    `${BASE_URL}/regularizations/bulk-approve`,
    {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }
  );
}

// ── Attendance Register (Admin) ──────────────────────

export interface AttendanceRegisterQuery {
  date?: string;
  departmentId?: number;
  shiftId?: number;
  status?: string;
  search?: string;
}

export interface AttendanceRegisterRecord {
  emp_id: number;
  employee_code: string;
  name: string;
  department: string;
  department_id: number;
  shift_id: number | null;
  shift_name: string;
  in_time: string;
  out_time: string;
  working_hours: string;
  production_minutes: number;
  status: string;
  is_late?: boolean;
  date: string;
  attendance_id: number | null;
}

export interface AttendanceRegisterResponse {
  date: string;
  formatted_date: string;
  summary: {
    total_employees: number;
    present_count: number;
    absent_count: number;
    on_leave_count: number;
    half_day_count: number;
    missing_punch_count: number;
  };
  records: AttendanceRegisterRecord[];
  departments: Array<{ id: number; name: string }>;
  shifts: Array<{ id: number; name: string }>;
  statuses?: string[];
}

export async function fetchAttendanceRegister(
  params: AttendanceRegisterQuery,
): Promise<AttendanceRegisterResponse> {
  const query = new URLSearchParams();
  if (params.date) query.append('date', params.date);
  if (params.departmentId) query.append('departmentId', String(params.departmentId));
  if (params.shiftId) query.append('shiftId', String(params.shiftId));
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);

  const qs = query.toString();
  return await customFetch<AttendanceRegisterResponse>(
    `${BASE_URL}/register${qs ? `?${qs}` : ''}`
  );
}

export interface AttendanceReportsQuery {
  reportType?: 'daily' | 'monthly_summary' | 'employee' | 'department' | 'late_early' | 'regularization';
  fromDate?: string;
  toDate?: string;
  departmentId?: string;
  employeeId?: number;
  shiftId?: number;
  status?: string;
}

export interface AttendanceReportsResponse {
  report_type: string;
  from_date: string;
  to_date: string;
  data: {
    type: string;
    columns?: string[];
    date_columns?: string[];
    employee?: {
      emp_id: number;
      employee_code: string;
      name: string;
      department: string;
    } | null;
    rows: any[];
  };
  departments: Array<{ id: number; name: string }>;
  shifts: Array<{ id: number; name: string }>;
  statuses: string[];
  employees: Array<{ id: number; code: string; name: string; department: string }>;
}

export async function fetchAttendanceReports(
  params: AttendanceReportsQuery,
): Promise<AttendanceReportsResponse> {
  const query = new URLSearchParams();
  if (params.reportType) query.append('reportType', params.reportType);
  if (params.fromDate) query.append('fromDate', params.fromDate);
  if (params.toDate) query.append('toDate', params.toDate);
  if (params.departmentId) query.append('departmentId', params.departmentId);
  if (params.employeeId) query.append('employeeId', String(params.employeeId));
  if (params.shiftId) query.append('shiftId', String(params.shiftId));
  if (params.status) query.append('status', params.status);

  const qs = query.toString();
  return await customFetch<AttendanceReportsResponse>(
    `${BASE_URL}/reports${qs ? `?${qs}` : ''}`
  );
}

