import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { templatesApi } from '../api/templates.api';
import type { DocumentLayout, TemplateEditorState, TemplateImageKind, TemplateKind } from '../types';

const key = (kind: TemplateKind) => ['document-template', kind] as const;

export function useTemplateEditorQuery(kind: TemplateKind) {
  return useQuery({ queryKey: key(kind), queryFn: () => templatesApi.editor(kind), staleTime: 30_000 });
}

/** Save / discard / approve all answer with the new editor state, which replaces the cached one. */
function useEditorMutation<TVars>(kind: TemplateKind, fn: (vars: TVars) => Promise<TemplateEditorState>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (state) => qc.setQueryData(key(kind), state),
  });
}

export const useSaveTemplateDraft = (kind: TemplateKind) =>
  useEditorMutation(kind, (layout: DocumentLayout) => templatesApi.saveDraft(kind, layout));

export const useDiscardTemplateDraft = (kind: TemplateKind) => useEditorMutation(kind, () => templatesApi.discardDraft(kind));

export const useApproveTemplate = (kind: TemplateKind) => useEditorMutation(kind, () => templatesApi.approve(kind));

export const usePreviewTemplate = (kind: TemplateKind) =>
  useMutation({
    mutationFn: (input: { layout?: DocumentLayout; subject?: Record<string, unknown> | null }) => templatesApi.preview(kind, input),
  });

export const useUploadTemplateImage = () =>
  useMutation({ mutationFn: ({ kind, file }: { kind: TemplateImageKind; file: File }) => templatesApi.uploadImage(kind, file) });

export function apiErrorText(err: any, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  return err.detail || err.message || fallback;
}
