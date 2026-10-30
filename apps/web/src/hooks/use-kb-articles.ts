import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export interface KbCategory {
  category_id: number;
  name: string;
  icon?: string;
  space: string;
}

export interface KbOwner {
  emp_id: number;
  name: string;
  email: string;
}

export interface KbArticleListItem {
  article_id: number;
  article_code: string;
  space: string;
  category: KbCategory;
  owner: KbOwner;
  content_type: string;
  is_pinned: boolean;
  is_archived: boolean;
  ack_required: boolean;
  ack_due_days: number;
  next_review_date?: string;
  views_count: number;
  downloads_count: number;
  created_at: string;
  updated_at?: string;
  title: string;
  summary: string;
  display_status: string;
  live_version?: {
    version_id: number;
    version_number: number;
    effective_from?: string;
    published_at?: string;
    tags: string[];
  } | null;
  pending_version?: {
    version_id: number;
    version_number: number;
    status: string;
    change_type?: string;
    change_summary?: string;
  } | null;
  user_acknowledgement?: {
    status: string;
    due_date: string;
    acknowledged_at?: string;
  } | null;
}

export interface KbAttachment {
  attachment_id: number;
  file_name: string;
  file_url: string;
  file_size_bytes: number | string;
  mime_type: string;
}

export interface KbArticleDetail {
  article_id: number;
  article_code: string;
  space: string;
  category: KbCategory;
  owner: KbOwner;
  content_type: string;
  review_cycle_months?: number;
  next_review_date?: string;
  last_reviewed_at?: string;
  ack_required: boolean;
  ack_due_days: number;
  audience_scope: string;
  audience_departments: number[];
  audience_roles: number[];
  audience_employees: number[];
  audience_companies: number[];
  audience_projects: number[];
  is_pinned: boolean;
  is_archived: boolean;
  archived_at?: string;
  archive_reason?: string;
  views_count: number;
  downloads_count: number;
  live_version?: any;
  pending_version?: any;
  current_display_version?: any;
  attachments: KbAttachment[];
  user_acknowledgement?: {
    status: string;
    due_date: string;
    acknowledged_at?: string;
  } | null;
  user_feedback?: {
    is_helpful: boolean;
    comment?: string;
  } | null;
  related_articles: Array<{
    article_id: number;
    article_code: string;
    title: string;
    summary: string;
  }>;
}

export interface KbKpiStats {
  published_articles: number;
  pending_approvals: number;
  open_drafts: number;
  review_due: number;
  overdue_acknowledgements: number;
}

export interface QueryKbArticlesParams {
  space?: 'INTERNAL' | 'CLIENT';
  category_id?: number;
  status?: string;
  search?: string;
  mine?: boolean;
  ack_only?: boolean;
  page?: number;
  limit?: number;
}

const API_BASE = '/api/v1/kb';

export function useKbKpisQuery() {
  return useQuery<KbKpiStats>({
    queryKey: ['kb-kpis'],
    queryFn: async () => {
      return customFetch<KbKpiStats>(`${API_BASE}/kpis`);
    },
  });
}

export function useKbArticlesQuery(params: QueryKbArticlesParams) {
  return useQuery<{ data: KbArticleListItem[]; pagination: any }>({
    queryKey: ['kb-articles', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.space) searchParams.append('space', params.space);
      if (params.category_id) searchParams.append('category_id', String(params.category_id));
      if (params.status) searchParams.append('status', params.status);
      if (params.search) searchParams.append('search', params.search);
      if (params.mine) searchParams.append('mine', 'true');
      if (params.ack_only) searchParams.append('ack_only', 'true');
      if (params.page) searchParams.append('page', String(params.page));
      if (params.limit) searchParams.append('limit', String(params.limit));

      return customFetch<{ data: KbArticleListItem[]; pagination: any }>(
        `${API_BASE}/articles?${searchParams.toString()}`,
      );
    },
  });
}

export function useKbArticleDetailQuery(identifier: string | number) {
  return useQuery<KbArticleDetail>({
    queryKey: ['kb-article', identifier],
    queryFn: async () => {
      return customFetch<KbArticleDetail>(`${API_BASE}/articles/${identifier}`);
    },
    enabled: Boolean(identifier),
  });
}

export function useCreateKbArticleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
        return customFetch<any>(`${API_BASE}/articles`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
  },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      queryClient.invalidateQueries({ queryKey: ['kb-kpis'] });
    },
  });
}

export function useUpdateKbDraftMutation(articleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
        return customFetch<any>(`${API_BASE}/articles/${articleId}/draft`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
  },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-article', articleId] });
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
    },
  });
}

export function useSubmitKbArticleMutation(articleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { change_type: 'MAJOR' | 'MINOR'; change_summary: string }) => {
        return customFetch<any>(`${API_BASE}/articles/${articleId}/submit`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
  },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-article', articleId] });
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      queryClient.invalidateQueries({ queryKey: ['kb-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['kb-approvals'] });
    },
  });
}

export function useWithdrawKbArticleMutation(articleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
        return customFetch<any>(`${API_BASE}/articles/${articleId}/withdraw`, {
          method: 'POST',
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-article', articleId] });
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      queryClient.invalidateQueries({ queryKey: ['kb-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['kb-approvals'] });
    },
  });
}

export function useReviewKbArticleMutation(articleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      versionId,
      action,
      comment,
    }: {
      versionId: number;
      action: 'APPROVE' | 'REJECT';
      comment?: string;
    }) => {
        return customFetch<any>(`${API_BASE}/articles/${articleId}/versions/${versionId}/review`, {
          method: 'POST',
          body: JSON.stringify({ action, comment }),
        });
  },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-article', articleId] });
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      queryClient.invalidateQueries({ queryKey: ['kb-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['kb-approvals'] });
    },
  });
}

export function useDirectPublishMutation(articleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      change_type: 'MAJOR' | 'MINOR';
      change_summary: string;
      reason: string;
    }) => {
        return customFetch<any>(`${API_BASE}/articles/${articleId}/publish-direct`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
  },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-article', articleId] });
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      queryClient.invalidateQueries({ queryKey: ['kb-kpis'] });
    },
  });
}

export function useAcknowledgePolicyMutation(articleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
        return customFetch<any>(`${API_BASE}/articles/${articleId}/acknowledge`, {
          method: 'POST',
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-article', articleId] });
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      queryClient.invalidateQueries({ queryKey: ['kb-kpis'] });
    },
  });
}

export function useSubmitFeedbackMutation(articleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { is_helpful: boolean; comment?: string }) => {
        return customFetch<any>(`${API_BASE}/articles/${articleId}/feedback`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-article', articleId] });
    },
  });
}

export function useArchiveKbArticleMutation(articleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { archive_reason: string; replacement_article_id?: number }) => {
        return customFetch<any>(`${API_BASE}/articles/${articleId}/archive`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-article', articleId] });
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      queryClient.invalidateQueries({ queryKey: ['kb-kpis'] });
    },
  });
}

export function useRestoreKbArticleMutation(articleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
        return customFetch<any>(`${API_BASE}/articles/${articleId}/restore`, {
          method: 'POST',
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-article', articleId] });
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      queryClient.invalidateQueries({ queryKey: ['kb-kpis'] });
    },
  });
}

export function useKbApprovalsQuery() {
  return useQuery<any[]>({
    queryKey: ['kb-approvals'],
    queryFn: async () => {
      return customFetch<any[]>(`${API_BASE}/approvals`);
    },
  });
}

export function useKbVersionsQuery(articleId: number) {
  return useQuery<any[]>({
    queryKey: ['kb-versions', articleId],
    queryFn: async () => {
      return customFetch<any[]>(`${API_BASE}/articles/${articleId}/versions`);
    },
    enabled: Boolean(articleId),
  });
}

export function useRecordViewMutation(articleId: number) {
  return useMutation({
    mutationFn: async () => {
        await customFetch<any>(`${API_BASE}/articles/${articleId}/view`, {
          method: 'POST',
        });
      },
  });
}
