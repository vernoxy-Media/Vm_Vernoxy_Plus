import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export interface CandidateItem {
  candidate_id: number;
  candidate_code: string;
  name: string;
  phone: string;
  email: string;
  gender_id?: number | null;
  current_location?: string | null;
  resume_url?: string | null;
  resume_filename?: string | null;
  role_id: number;
  role_name?: string;
  dep_id: number;
  department_name?: string;
  experience_type: 'fresher' | 'experienced';
  exp_years: number;
  exp_months: number;
  current_company?: string | null;
  current_designation?: string | null;
  current_ctc?: number | null;
  expected_ctc?: number | null;
  notice_period?: string | null;
  key_skills: string[];
  source: string;
  source_portal?: string | null;
  referred_by_emp_id?: number | null;
  referred_by_name?: string | null;
  stage: string;
  created_at: string;
}

export interface CandidateStats {
  total: number;
  interviewing: number;
  selected: number;
  onboarding: number;
}

export interface CandidateListResponse {
  items: CandidateItem[];
  total: number;
  stats: CandidateStats;
}

export interface DuplicateMatch {
  type: 'candidate' | 'employee';
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  stage?: string;
}

export interface CreateCandidatePayload {
  name: string;
  phone: string;
  email: string;
  gender_id?: number;
  current_location?: string;
  resume_url?: string;
  resume_filename?: string;
  resume_size?: number;
  resume_mime?: string;
  role_id: number;
  dep_id: number;
  experience_type: 'fresher' | 'experienced';
  exp_years?: number;
  exp_months?: number;
  current_company?: string;
  current_designation?: string;
  current_ctc?: number;
  expected_ctc?: number;
  notice_period?: string;
  serving_notice_lwd?: string;
  key_skills?: string[];
  source: string;
  source_portal?: string;
  referred_by_emp_id?: number;
  consultancy_name?: string;
  college_name?: string;
  source_details?: string;
  stage?: string;
  notes?: string;
}

export function useCandidatesQuery(params: {
  q?: string;
  roleId?: number;
  depId?: number;
  source?: string;
  stage?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['candidates', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params.q) searchParams.set('q', params.q);
      if (params.roleId) searchParams.set('roleId', String(params.roleId));
      if (params.depId) searchParams.set('depId', String(params.depId));
      if (params.source) searchParams.set('source', params.source);
      if (params.stage) searchParams.set('stage', params.stage);
      if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
      if (params.offset !== undefined) searchParams.set('offset', String(params.offset));

      const qs = searchParams.toString();
      return customFetch<CandidateListResponse>(`/api/v1/candidates${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useCandidateDetailQuery(candidateId?: number) {
  return useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: () => customFetch<CandidateItem>(`/api/v1/candidates/${candidateId}`),
    enabled: Boolean(candidateId),
  });
}

export function useNextCandidateCodeQuery() {
  return useQuery({
    queryKey: ['candidate-next-code'],
    queryFn: () => customFetch<{ candidate_code: string }>('/api/v1/candidates/next-code'),
    staleTime: 30000,
  });
}

export function useCheckDuplicateCandidateMutation() {
  return useMutation({
    mutationFn: (data: { phone: string; email: string }) =>
      customFetch<DuplicateMatch[]>('/api/v1/candidates/check-duplicate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useUploadCandidateResumeMutation() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      return customFetch<{
        resume_url: string;
        resume_filename: string;
        resume_size: number;
        resume_mime: string;
      }>('/api/v1/candidates/upload-resume', {
        method: 'POST',
        body: formData,
      });
    },
  });
}

export function useCreateCandidateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCandidatePayload) =>
      customFetch<CandidateItem>('/api/v1/candidates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-next-code'] });
    },
  });
}
