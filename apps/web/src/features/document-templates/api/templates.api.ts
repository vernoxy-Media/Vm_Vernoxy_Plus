import { customFetch } from '@vernoxy-pulse/api-client';
import type { DocumentLayout, PreviewResult, TemplateEditorState, TemplateImageKind, TemplateKind } from '../types';

/** Calls to the document-templates API only; no UI logic here. */

const BASE = '/api/v1/document-templates';

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const templatesApi = {
  editor: (kind: TemplateKind) => customFetch<TemplateEditorState>(`${BASE}/${kind}`),

  saveDraft: (kind: TemplateKind, layout: DocumentLayout) =>
    customFetch<TemplateEditorState>(`${BASE}/${kind}/draft`, json('PUT', { layout })),

  discardDraft: (kind: TemplateKind) => customFetch<TemplateEditorState>(`${BASE}/${kind}/draft`, json('DELETE')),

  approve: (kind: TemplateKind) => customFetch<TemplateEditorState>(`${BASE}/${kind}/approve`, json('POST')),

  preview: (kind: TemplateKind, input: { layout?: DocumentLayout; subject?: Record<string, unknown> | null }) =>
    customFetch<PreviewResult>(`${BASE}/${kind}/preview`, json('POST', { layout: input.layout, subject: input.subject ?? undefined })),

  uploadImage: (kind: TemplateImageKind, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return customFetch<{ asset_id: number; url: string }>(`${BASE}/assets/${kind}`, { method: 'POST', body: form });
  },
};
