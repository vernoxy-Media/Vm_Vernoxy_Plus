import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

/** One standard employee document (Settings -> Employee Documents); comes from the database. */
export interface ChecklistDocument {
  checklist_id: number;
  document_type: string;
  title: string;
  category: 'agreement' | 'given_to_employee' | 'taken_from_employee';
  is_required_for_activation: boolean;
  lock_when_active: boolean;
  /** Pulse makes / handles it itself: it cannot be removed or switched off. */
  is_system: boolean;
  display_order: number;
  is_active: boolean;
  /** Employees who have this document. */
  employees: number;
}

export interface ChecklistInput {
  title?: string;
  is_required_for_activation?: boolean;
  display_order?: number;
  is_active?: boolean;
}

const URL = '/api/v1/employee-document-checklist';

export function useDocumentChecklistQuery() {
  return useQuery({ queryKey: ['employee-document-checklist'], queryFn: () => customFetch<ChecklistDocument[]>(URL) });
}

function useChecklistMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-document-checklist'] });
      // Names and "required" show on every employee's Documents tab and activation checklist.
      qc.invalidateQueries({ queryKey: ['employee-documents'] });
      qc.invalidateQueries({ queryKey: ['employee-activation-status'] });
    },
  });
}

export const useCreateChecklistDocumentMutation = () =>
  useChecklistMutation((dto: ChecklistInput) => customFetch<ChecklistDocument>(URL, { method: 'POST', body: JSON.stringify(dto) }));

export const useUpdateChecklistDocumentMutation = () =>
  useChecklistMutation(({ id, dto }: { id: number; dto: ChecklistInput }) =>
    customFetch<ChecklistDocument>(`${URL}/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  );

export const useDeleteChecklistDocumentMutation = () =>
  useChecklistMutation((id: number) => customFetch<{ deleted: boolean; deactivated: boolean }>(`${URL}/${id}`, { method: 'DELETE' }));
