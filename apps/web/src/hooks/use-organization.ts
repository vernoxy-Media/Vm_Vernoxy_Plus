import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  customFetch,
  DepartmentResponseDto,
  DepartmentListResponseDto,
  DepartmentOptionDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  RoleResponseDto,
  RoleListResponseDto,
  RoleOptionDto,
  CreateRoleDto,
  UpdateRoleDto,
  EmployeeResponseDto,
  EmployeeListResponseDto,
  EmployeeOptionDto,
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from '@vernoxy-pulse/api-client';

// ========================
// DEPARTMENTS HOOKS
// ========================

export function useDepartmentsQuery(params?: {
  q?: string;
  is_active?: boolean;
  limit?: number;
  cursor?: string;
}) {
  return useQuery({
    queryKey: ['departments', params],
    queryFn: () => {
      const q = new URLSearchParams();
      if (params?.q) q.set('q', params.q);
      if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.cursor) q.set('cursor', params.cursor);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return customFetch<DepartmentListResponseDto>(`/api/v1/departments${qs}`);
    },
  });
}

export function useDepartmentOptionsQuery() {
  return useQuery({
    queryKey: ['department-options'],
    queryFn: () => customFetch<DepartmentOptionDto[]>('/api/v1/departments/options'),
  });
}

export function useDepartmentDetailQuery(id?: number) {
  return useQuery({
    queryKey: ['department', id],
    queryFn: () => customFetch<DepartmentResponseDto>(`/api/v1/departments/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateDepartmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentDto) =>
      customFetch<DepartmentResponseDto>('/api/v1/departments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department-options'] });
    },
  });
}

export function useUpdateDepartmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDepartmentDto }) =>
      customFetch<DepartmentResponseDto>(`/api/v1/departments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department-options'] });
    },
  });
}

export function useDeleteDepartmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<void>(`/api/v1/departments/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department-options'] });
    },
  });
}

// ========================
// ROLES HOOKS
// ========================

export function useRolesQuery(params?: {
  dep_id?: number;
  q?: string;
  is_active?: boolean;
  limit?: number;
  cursor?: string;
}) {
  return useQuery({
    queryKey: ['roles', params],
    queryFn: () => {
      const q = new URLSearchParams();
      if (params?.dep_id) q.set('dep_id', String(params.dep_id));
      if (params?.q) q.set('q', params.q);
      if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.cursor) q.set('cursor', params.cursor);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return customFetch<RoleListResponseDto>(`/api/v1/roles${qs}`);
    },
  });
}

export function useRoleOptionsQuery(depId?: number) {
  return useQuery({
    queryKey: ['role-options', depId],
    queryFn: () => customFetch<RoleOptionDto[]>(`/api/v1/roles/options?dep_id=${depId}`),
    enabled: Boolean(depId),
  });
}

export function useRoleDetailQuery(id?: number) {
  return useQuery({
    queryKey: ['role', id],
    queryFn: () => customFetch<RoleResponseDto>(`/api/v1/roles/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoleDto) =>
      customFetch<RoleResponseDto>('/api/v1/roles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-options'] });
    },
  });
}

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleDto }) =>
      customFetch<RoleResponseDto>(`/api/v1/roles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-options'] });
    },
  });
}

export function useDeleteRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<void>(`/api/v1/roles/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-options'] });
    },
  });
}

// ========================
// EMPLOYEES HOOKS
// ========================

export function useEmployeesQuery(params?: {
  q?: string;
  dep_id?: number;
  role_id?: number;
  status?: 'Active' | 'Inactive';
  limit?: number;
  cursor?: string;
}) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => {
      const q = new URLSearchParams();
      if (params?.q) q.set('q', params.q);
      if (params?.dep_id) q.set('dep_id', String(params.dep_id));
      if (params?.role_id) q.set('role_id', String(params.role_id));
      if (params?.status) q.set('status', params.status);
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.cursor) q.set('cursor', params.cursor);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return customFetch<EmployeeListResponseDto>(`/api/v1/employees${qs}`);
    },
  });
}

export function useEmployeeOptionsQuery(search?: string) {
  return useQuery({
    queryKey: ['employee-options', search],
    queryFn: () =>
      customFetch<EmployeeOptionDto[]>(
        `/api/v1/employees/options${search ? `?q=${encodeURIComponent(search)}` : ''}`,
      ),
  });
}

export function useEmployeeDetailQuery(id?: number) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => customFetch<EmployeeResponseDto>(`/api/v1/employees/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateEmployeeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeDto) =>
      customFetch<EmployeeResponseDto>('/api/v1/employees', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-options'] });
    },
  });
}

export function useUpdateEmployeeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEmployeeDto }) =>
      customFetch<EmployeeResponseDto>(`/api/v1/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-options'] });
    },
  });
}

export function useDeleteEmployeeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<void>(`/api/v1/employees/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-options'] });
    },
  });
}

export function useUploadEmployeePhotoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      return customFetch<EmployeeResponseDto>(`/api/v1/employees/${id}/photo`, {
        method: 'PUT',
        body: formData,
      });
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    },
  });
}

export function useRemoveEmployeePhotoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<void>(`/api/v1/employees/${id}/photo`, {
        method: 'DELETE',
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    },
  });
}

