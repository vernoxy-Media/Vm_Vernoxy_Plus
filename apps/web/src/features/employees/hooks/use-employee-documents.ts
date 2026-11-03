import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export interface EmployeeDocumentItem {
  doc_id: number;
  emp_id: number;
  category: 'given_to_employee' | 'taken_from_employee' | 'agreement' | 'other' | string;
  document_type: string;
  title: string;
  is_ticked: boolean;
  status: 'uploaded' | 'file_pending' | 'not_ticked' | 'locked' | 'draft' | 'final' | 'issued' | 'accepted' | 'signed' | 'declined';
  is_required_for_activation?: boolean;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  draft_content?: string | null;
  template_id?: number | null;
  issued_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface DocumentTemplateItem {
  template_id: number;
  code: string;
  name: string;
  document_type: string;
  description?: string | null;
  content_html: string;
  is_active: boolean;
}

export function useEmployeeDocumentsQuery(empId?: number) {
  return useQuery({
    queryKey: ['employee-documents', empId],
    queryFn: () => customFetch<EmployeeDocumentItem[]>(`/api/v1/employees/${empId}/documents`),
    enabled: Boolean(empId),
  });
}

export function useDocumentTemplatesQuery(documentType?: string) {
  return useQuery({
    queryKey: ['document-templates', documentType],
    queryFn: () => {
      const qs = documentType ? `?document_type=${documentType}` : '';
      return customFetch<DocumentTemplateItem[]>(`/api/v1/document-templates${qs}`);
    },
  });
}

export function useToggleEmployeeDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      empId,
      documentType,
      isTicked,
    }: {
      empId: number;
      documentType: string;
      isTicked: boolean;
    }) =>
      customFetch<EmployeeDocumentItem>(`/api/v1/employees/${empId}/documents/${documentType}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ is_ticked: isTicked }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.empId] });
    },
  });
}

export function useUploadEmployeeDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      empId,
      documentType,
      file,
    }: {
      empId: number;
      documentType: string;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      return customFetch<EmployeeDocumentItem>(
        `/api/v1/employees/${empId}/documents/${documentType}/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.empId] });
    },
  });
}

export function useRemoveEmployeeDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empId, documentType }: { empId: number; documentType: string }) =>
      customFetch<EmployeeDocumentItem>(`/api/v1/employees/${empId}/documents/${documentType}/file`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.empId] });
    },
  });
}

export function useGenerateDocumentDraftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      empId,
      templateId,
      documentType,
      candidateName,
      designation,
      department,
      proposedJoiningDate,
      offerValidTillDate,
      customSalary,
      customPf,
      notes,
    }: {
      empId: number;
      templateId?: number;
      documentType: string;
      candidateName?: string;
      designation?: string;
      department?: string;
      proposedJoiningDate?: string;
      offerValidTillDate?: string;
      customSalary?: number;
      customPf?: number;
      notes?: string;
    }) =>
      customFetch<{ draft_content: string; document: EmployeeDocumentItem }>(
        `/api/v1/employees/${empId}/documents/generate-draft`,
        {
          method: 'POST',
          body: JSON.stringify({
            template_id: templateId,
            document_type: documentType,
            candidate_name: candidateName,
            designation,
            department,
            proposed_joining_date: proposedJoiningDate,
            offer_valid_till_date: offerValidTillDate,
            custom_salary: customSalary,
            custom_pf: customPf,
            notes,
          }),
        },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.empId] });
    },
  });
}

export function useFinalizeDocumentDraftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      empId,
      documentType,
      finalContent,
      notes,
    }: {
      empId: number;
      documentType: string;
      finalContent: string;
      notes?: string;
    }) =>
      customFetch<EmployeeDocumentItem>(`/api/v1/employees/${empId}/documents/finalize`, {
        method: 'POST',
        body: JSON.stringify({
          document_type: documentType,
          final_content: finalContent,
          notes,
        }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.empId] });
    },
  });
}

export function useDeclineEmployeeDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      empId,
      documentType,
      reason,
    }: {
      empId: number;
      documentType: string;
      reason?: string;
    }) =>
      customFetch<EmployeeDocumentItem>(`/api/v1/employees/${empId}/documents/${documentType}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.empId] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

export interface EmployeeActivationStatus {
  can_activate: boolean;
  is_already_active: boolean;
  missing_documents: string[];
  total_required: number;
  completed_required: number;
  is_details_completed?: boolean;
  missing_details?: string[];
}

export interface ActivateEmployeeResult {
  success: boolean;
  message: string;
  emp_id: number;
  office_email: string;
  temporary_password: string;
  must_change_password: boolean;
}

export function useEmployeeActivationStatusQuery(empId?: number) {
  return useQuery({
    queryKey: ['employee-activation-status', empId],
    queryFn: () => customFetch<EmployeeActivationStatus>(`/api/v1/employees/${empId}/activation-status`),
    enabled: Boolean(empId),
  });
}

export function useActivateEmployeeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (empId: number) =>
      customFetch<ActivateEmployeeResult>(`/api/v1/employees/${empId}/activate`, {
        method: 'POST',
      }),
    onSuccess: (_, empId) => {
      queryClient.invalidateQueries({ queryKey: ['employee', empId] });
      queryClient.invalidateQueries({ queryKey: ['employee-documents', empId] });
      queryClient.invalidateQueries({ queryKey: ['employee-activation-status', empId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useResendEmployeeLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (empId: number) =>
      customFetch<ActivateEmployeeResult>(`/api/v1/employees/${empId}/resend-login`, {
        method: 'POST',
      }),
    onSuccess: (_, empId) => {
      queryClient.invalidateQueries({ queryKey: ['employee', empId] });
      queryClient.invalidateQueries({ queryKey: ['employee-documents', empId] });
    },
  });
}

export function useAddCustomDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empId, title, isRequired }: { empId: number; title: string; isRequired?: boolean }) =>
      customFetch<EmployeeDocumentItem>(`/api/v1/employees/${empId}/documents/custom`, {
        method: 'POST',
        body: JSON.stringify({ title, is_required_for_activation: isRequired }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.empId] });
      queryClient.invalidateQueries({ queryKey: ['employee-activation-status', variables.empId] });
    },
  });
}

export function useDeleteCustomDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empId, documentType }: { empId: number; documentType: string }) =>
      customFetch<{ success: boolean }>(`/api/v1/employees/${empId}/documents/${documentType}/custom`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.empId] });
      queryClient.invalidateQueries({ queryKey: ['employee-activation-status', variables.empId] });
    },
  });
}
