import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, Printer, RotateCcw, Save, Trash2 } from 'lucide-react';
import { Banner, btn, filterCls } from '@/features/payroll/components/payroll-ui';
import { TemplateSectionEditor } from './TemplateSectionEditor';
import { TemplatePreviewFrame } from './TemplatePreviewFrame';
import { CoverPhotoCropModal } from './CoverPhotoCropModal';
import {
  apiErrorText,
  useApproveTemplate,
  useDiscardTemplateDraft,
  usePreviewTemplate,
  useSaveTemplateDraft,
  useTemplateEditorQuery,
  useUploadTemplateImage,
} from '../hooks/use-document-templates';
import { printHtmlDocument } from '@/shared/utils/print-html';
import type { DocumentLayout, LayoutSection, TemplateImageKind, TemplateKind } from '../types';

const fmtStamp = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/** What a page can use to add its own controls (letterhead, signature, ...). */
export interface EditorContext {
  layout: DocumentLayout;
  setLayout: (layout: DocumentLayout) => void;
  /** Uploads the image and returns its asset id (null when it failed; the error is shown). */
  uploadImage: (kind: TemplateImageKind, file: File) => Promise<number | null>;
  uploading: boolean;
}

interface Props {
  kind: TemplateKind;
  heading: string;
  intro: string;
  /** e.g. "Salary Slips" / "quotations" (used in the approve confirmation). */
  documentsName: string;
  /** Which data the test document shows (null = sample data). */
  subject: Record<string, unknown> | null;
  /** Controls in the preview toolbar (choice of test data). */
  testToolbar?: React.ReactNode;
  /** A panel above the preview (e.g. the typed-in test values). */
  testPanel?: React.ReactNode;
  /** When set, the live preview is not requested and this copy is shown in the frame. */
  emptyPreview?: string | null;
  printLabel?: string;
  renderTopExtras?: (ctx: EditorContext) => React.ReactNode;
  renderSectionExtras?: (sectionKey: string, ctx: EditorContext) => React.ReactNode;
}

/**
 * The Template Management editor shared by every document kind: status and actions (save draft,
 * discard, approve), title, image slots, section editors and the live test document. Amounts and
 * details always come from the document's data; here only the template is edited.
 */
export const TemplateEditor: React.FC<Props> = ({
  kind,
  heading,
  intro,
  documentsName,
  subject,
  testToolbar,
  testPanel,
  emptyPreview,
  printLabel = 'Print test document',
  renderTopExtras,
  renderSectionExtras,
}) => {
  const editor = useTemplateEditorQuery(kind);
  const save = useSaveTemplateDraft(kind);
  const discard = useDiscardTemplateDraft(kind);
  const approve = useApproveTemplate(kind);
  const preview = usePreviewTemplate(kind);
  const upload = useUploadTemplateImage();

  const state = editor.data;
  const [layout, setLayout] = useState<DocumentLayout | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [cropSession, setCropSession] = useState<{ slotKey: string; kind: TemplateImageKind; src: string; fileName: string } | null>(null);

  // Start from the server's layout, and take it again after every save / discard / approve.
  useEffect(() => {
    if (state) setLayout(state.layout);
  }, [state]);

  const dirty = useMemo(() => Boolean(state && layout && JSON.stringify(layout) !== JSON.stringify(state.layout)), [state, layout]);

  // Live preview, half a second after the last change.
  const previewMutate = preview.mutate;
  const subjectKey = JSON.stringify(subject);
  useEffect(() => {
    if (!layout) return;
    if (emptyPreview) {
      setPreviewHtml(null);
      return;
    }
    const t = setTimeout(() => {
      previewMutate(
        { layout, subject: subjectKey === 'null' ? null : JSON.parse(subjectKey) },
        {
          onSuccess: (r) => setPreviewHtml(r.html),
          onError: () => setPreviewHtml(null),
        },
      );
    }, 500);
    return () => clearTimeout(t);
  }, [layout, subjectKey, emptyPreview, previewMutate]);

  if (editor.error) return <Banner>{apiErrorText(editor.error)}</Banner>;
  if (editor.isLoading || !layout || !state) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const setSection = (next: LayoutSection) => setLayout({ ...layout, sections: layout.sections.map((s) => (s.key === next.key ? next : s)) });
  const run = (p: Promise<unknown>, ok: string) =>
    p.then(
      () => setNotice({ tone: 'ok', text: ok }),
      (err) => setNotice({ tone: 'error', text: apiErrorText(err) }),
    );

  const uploadImage = async (imageKind: TemplateImageKind, file: File): Promise<number | null> => {
    try {
      const r = await upload.mutateAsync({ kind: imageKind, file });
      setNotice({ tone: 'ok', text: 'Image added. Save the draft to keep it.' });
      return r.asset_id;
    } catch (err) {
      setNotice({ tone: 'error', text: apiErrorText(err) });
      return null;
    }
  };
  const ctx: EditorContext = { layout, setLayout, uploadImage, uploading: upload.isPending };

  const onSave = () => run(save.mutateAsync(layout), `Draft v${state.draft?.version ?? (state.approved?.version ?? 0) + 1} saved. Check a test document, then approve it.`);
  const onDiscard = () => {
    if (window.confirm('Throw the draft away? The approved version stays as it is.')) run(discard.mutateAsync(undefined), 'Draft thrown away.');
  };
  const onApprove = () => {
    if (window.confirm(`Approve this template? From now on, new ${documentsName} use it. Documents made before keep their old look.`))
      run(approve.mutateAsync(undefined), `Approved. New ${documentsName} use this template.`);
  };

  const busy = save.isPending || discard.isPending || approve.isPending;
  // Nothing saved or approved yet: the starting layout may be saved as it is (no change needed).
  const firstVersion = !state.draft && !state.approved;
  const canSave = (dirty || firstVersion) && !busy;
  const canApprove = Boolean(state.draft) && !dirty && !busy;
  const imageSlots = state.catalog.images ?? [];

  return (
    <div className="space-y-4">
      {/* Title and status */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">{intro}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
            {state.approved ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                Approved v{state.approved.version}
                {state.approved.approved_by_name ? ` by ${state.approved.approved_by_name}` : ''} · {fmtStamp(state.approved.approved_at)}
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">Not approved yet</span>
            )}
            {state.draft && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                Draft v{state.draft.version} · saved {fmtStamp(state.draft.updated_at)}
              </span>
            )}
            {dirty && <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">Unsaved changes</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {dirty && (
            <button type="button" className={btn.secondary} onClick={() => setLayout(state.layout)} disabled={busy}>
              <RotateCcw className="h-4 w-4" /> Undo changes
            </button>
          )}
          {state.draft && !dirty && (
            <button type="button" className={btn.secondary} onClick={onDiscard} disabled={busy}>
              <Trash2 className="h-4 w-4" /> Discard draft
            </button>
          )}
          <button type="button" className={btn.secondary} onClick={onSave} disabled={!canSave}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft
          </button>
          <button type="button" className={btn.primary} onClick={onApprove} disabled={!canApprove} title={dirty ? 'Save the draft first' : !state.draft ? 'Save a draft first' : undefined}>
            {approve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve
          </button>
        </div>
      </div>

      {state.legacy_in_use && <Banner tone="info">The old fixed template is still in use. Approving this template replaces it for new documents.</Banner>}
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Editor */}
        <div className="space-y-3">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <label className="block text-[12px] font-medium text-slate-600">
              Document title
              <input className={`${filterCls} mt-1 w-full`} value={layout.title} maxLength={60} onChange={(e) => setLayout({ ...layout, title: e.target.value })} />
            </label>

            {imageSlots.map((slot) => {
              const assetId = layout.images?.[slot.key] ?? null;
              return (
                <div key={slot.key} className="flex flex-wrap items-center gap-2">
                  <span className="w-28 shrink-0 text-[12px] font-medium text-slate-600">{slot.label}</span>
                  <input
                    ref={(el) => {
                      fileInputs.current[slot.key] = el;
                    }}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      if (slot.kind === 'photo') {
                        setCropSession({ slotKey: slot.key, kind: slot.kind, src: URL.createObjectURL(file), fileName: file.name });
                        return;
                      }
                      const id = await uploadImage(slot.kind, file);
                      if (id) setLayout({ ...layout, images: { ...layout.images, [slot.key]: id } });
                    }}
                  />
                  <button type="button" className={btn.secondary} onClick={() => fileInputs.current[slot.key]?.click()} disabled={upload.isPending}>
                    {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {assetId ? 'Replace' : 'Upload'}
                  </button>
                  {assetId && (
                    <button type="button" className={btn.secondary} onClick={() => setLayout({ ...layout, images: { ...layout.images, [slot.key]: null } })}>
                      Remove
                    </button>
                  )}
                  {slot.hint && <span className="text-[11px] text-slate-400">{slot.hint}</span>}
                </div>
              );
            })}

            {renderTopExtras?.(ctx)}
          </div>

          {layout.sections.map((section) => {
            const catalog = state.catalog.sections.find((c) => c.key === section.key);
            if (!catalog) return null;
            return (
              <TemplateSectionEditor key={section.key} section={section} catalog={catalog} onChange={setSection}>
                {renderSectionExtras?.(section.key, ctx) ?? null}
              </TemplateSectionEditor>
            );
          })}
        </div>

        {/* Test document */}
        <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
            {testToolbar}
            <button
              type="button"
              className={`${btn.secondary} ml-auto`}
              disabled={!previewHtml || Boolean(emptyPreview)}
              onClick={() => {
                if (!previewHtml || emptyPreview) return;
                // The title becomes the file name when "Save as PDF" is chosen in the print dialog.
                printHtmlDocument(previewHtml, `${heading.replace(/\s*Template$/i, '')} - test`);
              }}
            >
              <Printer className="h-4 w-4" /> {printLabel}
            </button>
          </div>
          {testPanel}
          {preview.error && !emptyPreview && <Banner>{apiErrorText(preview.error)}</Banner>}
          <TemplatePreviewFrame
            title={heading}
            html={emptyPreview ? null : previewHtml}
            loading={preview.isPending && !emptyPreview}
            emptyText={emptyPreview}
          />
          <p className="text-[11px] text-slate-400">Test documents are never saved, numbered or sent.</p>
        </div>
      </div>

      {cropSession && (
        <CoverPhotoCropModal
          open
          imageSrc={cropSession.src}
          fileName={cropSession.fileName}
          onCancel={() => {
            URL.revokeObjectURL(cropSession.src);
            setCropSession(null);
          }}
          onConfirm={async (file) => {
            const session = cropSession;
            URL.revokeObjectURL(session.src);
            setCropSession(null);
            const id = await uploadImage(session.kind, file);
            if (id) {
              setLayout((current) =>
                current ? { ...current, images: { ...current.images, [session.slotKey]: id } } : current,
              );
            }
          }}
        />
      )}
    </div>
  );
};
