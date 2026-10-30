import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export interface KbCategory {
  category_id: number;
  space: 'INTERNAL' | 'CLIENT';
  name: string;
  description?: string | null;
  icon?: string | null;
  default_owner_id?: number | null;
  default_owner?: {
    emp_id: number;
    name: string;
    email: string;
  } | null;
  default_approver_id?: number | null;
  default_approver?: {
    emp_id: number;
    name: string;
    email: string;
  } | null;
  default_review_cycle_months?: number | null;
  default_ack_required: boolean;
  default_audience_scope: 'ALL' | 'CUSTOM';
  default_audience_departments: number[];
  default_audience_roles: number[];
  default_audience_employees: number[];
  default_audience_companies: number[];
  default_audience_projects: number[];
  display_order: number;
  is_active: boolean;
  articles_count: number;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateKbCategoryInput {
  space: 'INTERNAL' | 'CLIENT';
  name: string;
  description?: string;
  icon?: string;
  default_owner_id?: number;
  default_approver_id?: number;
  default_review_cycle_months?: number;
  default_ack_required?: boolean;
  default_audience_scope?: 'ALL' | 'CUSTOM';
  default_audience_departments?: number[];
  default_audience_roles?: number[];
  default_audience_employees?: number[];
  default_audience_companies?: number[];
  default_audience_projects?: number[];
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateKbCategoryInput {
  name?: string;
  description?: string;
  icon?: string;
  default_owner_id?: number | null;
  default_approver_id?: number | null;
  default_review_cycle_months?: number | null;
  default_ack_required?: boolean;
  default_audience_scope?: 'ALL' | 'CUSTOM';
  default_audience_departments?: number[];
  default_audience_roles?: number[];
  default_audience_employees?: number[];
  default_audience_companies?: number[];
  default_audience_projects?: number[];
  display_order?: number;
  is_active?: boolean;
}

export function useKbCategoriesQuery(space?: 'INTERNAL' | 'CLIENT', includeInactive = true) {
  return useQuery({
    queryKey: ['kb-categories', space, includeInactive],
    queryFn: async (): Promise<KbCategory[]> => {
      const params = new URLSearchParams();
      if (space) params.append('space', space);
      if (includeInactive) params.append('includeInactive', 'true');
      return customFetch(`/api/v1/kb/settings/categories?${params.toString()}`);
    },
  });
}

export function useCreateKbCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateKbCategoryInput): Promise<KbCategory> => {
      return customFetch('/api/v1/kb/settings/categories', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
    },
  });
}

export function useUpdateKbCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: number; dto: UpdateKbCategoryInput }): Promise<KbCategory> => {
      return customFetch(`/api/v1/kb/settings/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
    },
  });
}

export function useDeleteKbCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<{ success: boolean; message: string }> => {
      return customFetch(`/api/v1/kb/settings/categories/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
    },
  });
}

