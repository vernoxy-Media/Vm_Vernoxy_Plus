import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export interface AttachmentItem {
  attachment_id: number;
  entity_type: string;
  entity_id: number;
  file_name: string;
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
  display_order: number;
  created_at: string;
  created_by: number;
  created_by_name?: string | null;
}

// -----------------------------------------------------------------------------
// Queries & Mutations
// -----------------------------------------------------------------------------

export function useEntityAttachmentsQuery(entityType: string, entityId: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ['attachments', entityType, entityId],
    queryFn: () => customFetch<AttachmentItem[]>(`/api/v1/attachments/${entityType}/${entityId}`),
    enabled: enabled && Boolean(entityType) && Boolean(entityId),
  });
}

export function useUploadAttachmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entityType,
      entityId = 0,
      file,
      displayOrder = 1,
    }: {
      entityType: string;
      entityId?: number;
      file: File;
      displayOrder?: number;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', entityType);
      formData.append('entity_id', String(entityId || 0));
      formData.append('display_order', String(displayOrder));

      return customFetch<AttachmentItem>('/api/v1/attachments/upload', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: (_, variables) => {
      if (variables.entityId) {
        queryClient.invalidateQueries({
          queryKey: ['attachments', variables.entityType, variables.entityId],
        });
      }
    },
  });
}
export const useUploadAttachment = useUploadAttachmentMutation;

export function useDeleteAttachmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      attachmentId,
    }: {
      attachmentId: number;
      entityType: string;
      entityId: number;
    }) => {
      return customFetch<void>(`/api/v1/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['attachments', variables.entityType, variables.entityId],
      });
    },
  });
}

export function useReorderAttachmentsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      attachmentIds,
    }: {
      entityType: string;
      entityId: number;
      attachmentIds: number[];
    }) => {
      return customFetch<AttachmentItem[]>(`/api/v1/attachments/${entityType}/${entityId}/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ attachment_ids: attachmentIds }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['attachments', variables.entityType, variables.entityId],
      });
    },
  });
}
