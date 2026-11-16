import React, { useEffect, useMemo, useState } from 'react';
import { Download, File as FileIcon, FileText, Film, Music, Archive, X } from 'lucide-react';
import type { DiscussionAttachment } from '../types';

/** What may be picked in the composer: pictures, videos, audio, documents and archives. */
export const ATTACH_ACCEPT = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.zip';
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 10;
/** Saved as the comment text when a file is sent without any words; never shown. */
export const FILES_ONLY_TEXT = 'Attached files';

const BLOCKED = new Set(['image/svg+xml', 'text/html']);
const OK_TYPES = /^(image|video|audio|text)\/|^application\/(pdf|zip|x-zip-compressed|json|msword|vnd\.ms-excel|vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation))$/;

/** Why a picked file cannot be sent, or null when it can. */
export function fileProblem(f: File): string | null {
  if (f.size === 0) return `${f.name} is empty.`;
  if (f.size > MAX_FILE_BYTES) return `${f.name} is larger than 25 MB.`;
  const t = (f.type || '').toLowerCase();
  if (BLOCKED.has(t) || !OK_TYPES.test(t)) return `${f.name}: this type of file cannot be shared.`;
  return null;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

const kindOf = (mime: string) => (mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'file');

const FileGlyph: React.FC<{ mime: string; className?: string }> = ({ mime, className = 'h-5 w-5' }) => {
  if (mime.startsWith('video/')) return <Film className={className} />;
  if (mime.startsWith('audio/')) return <Music className={className} />;
  if (mime.includes('zip')) return <Archive className={className} />;
  if (mime === 'application/pdf' || mime.startsWith('text/') || mime.includes('word') || mime.includes('sheet') || mime.includes('presentation')) return <FileText className={className} />;
  return <FileIcon className={className} />;
};

/** The files of a comment, the way Jira shows them: pictures and videos play right there, other files are a card. */
export const AttachmentList: React.FC<{ files: DiscussionAttachment[] }> = ({ files }) => {
  const [zoom, setZoom] = useState<DiscussionAttachment | null>(null);
  const media = files.filter((f) => ['image', 'video'].includes(kindOf(f.mime)));
  const others = files.filter((f) => !['image', 'video'].includes(kindOf(f.mime)));

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  if (files.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {media.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {media.map((f) =>
            kindOf(f.mime) === 'image' ? (
              <button key={f.attachment_id} type="button" onClick={() => setZoom(f)} title={f.name} className="group relative cursor-zoom-in overflow-hidden rounded-[3px] border border-[#DFE1E6] bg-[#F4F5F7]">
                <img src={f.url} alt={f.name} loading="lazy" className="block max-h-44 max-w-full object-cover sm:max-h-56 sm:max-w-[320px]" />
              </button>
            ) : (
              <div key={f.attachment_id} className="w-full max-w-[420px] overflow-hidden rounded-[3px] border border-[#DFE1E6] bg-black">
                <video src={f.url} controls preload="metadata" playsInline className="block max-h-72 w-full" />
                <div className="flex items-center justify-between gap-2 bg-[#F4F5F7] px-2 py-1 text-[12px] text-[#42526E]">
                  <span className="truncate">{f.name} · {formatSize(f.size)}</span>
                  <a href={f.url} download={f.name} className="shrink-0 text-[color:var(--ac-main,#0052CC)] hover:underline">Download</a>
                </div>
              </div>
            ),
          )}
        </div>
      )}
      {others.length > 0 && (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {others.map((f) =>
            kindOf(f.mime) === 'audio' ? (
              <li key={f.attachment_id} className="rounded-[3px] border border-[#DFE1E6] bg-[#FAFBFC] p-2 sm:col-span-2">
                <p className="mb-1 truncate text-[12px] text-[#42526E]">{f.name} · {formatSize(f.size)}</p>
                <audio src={f.url} controls preload="none" className="w-full" />
              </li>
            ) : (
              <li key={f.attachment_id}>
                <a href={f.url} target="_blank" rel="noreferrer" download={f.name} className="flex items-center gap-2.5 rounded-[3px] border border-[#DFE1E6] bg-[#FAFBFC] px-2.5 py-2 transition hover:bg-[#F4F5F7]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-dark,#0747A6)]"><FileGlyph mime={f.mime} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[#172B4D]">{f.name}</span>
                    <span className="block text-[11px] text-[#5E6C84]">{formatSize(f.size)}</span>
                  </span>
                  <Download className="h-4 w-4 shrink-0 text-[#5E6C84]" />
                </a>
              </li>
            ),
          )}
        </ul>
      )}

      {zoom && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-[rgba(9,30,66,0.85)]" role="dialog" aria-modal="true" aria-label={zoom.name} onClick={() => setZoom(null)}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="min-w-0 truncate text-[14px] font-medium">{zoom.name}</span>
            <div className="flex shrink-0 items-center gap-1">
              <a href={zoom.url} download={zoom.name} className="inline-flex h-8 items-center gap-1.5 rounded-[3px] px-2.5 text-[13px] hover:bg-white/15"><Download className="h-4 w-4" /> Download</a>
              <button type="button" onClick={() => setZoom(null)} aria-label="Close" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[3px] hover:bg-white/15"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <img src={zoom.url} alt={zoom.name} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-[3px] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};

/** The files picked in the composer, before they are sent: a thumbnail (or an icon) with a remove button. */
export const PendingFiles: React.FC<{ files: File[]; onRemove: (i: number) => void; disabled?: boolean }> = ({ files, onRemove, disabled }) => {
  const previews = useMemo(() => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)), [files]);
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);
  if (files.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {files.map((f, i) => (
        <li key={`${f.name}-${i}`} className="relative flex w-[150px] items-center gap-2 rounded-[3px] border border-[#DFE1E6] bg-[#FAFBFC] p-1.5 pr-6">
          {previews[i] ? (
            <img src={previews[i]!} alt="" className="h-9 w-9 shrink-0 rounded-[3px] object-cover" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-dark,#0747A6)]"><FileGlyph mime={f.type} className="h-4 w-4" /></span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-medium text-[#172B4D]" title={f.name}>{f.name}</span>
            <span className="block text-[11px] text-[#5E6C84]">{formatSize(f.size)}</span>
          </span>
          <button type="button" disabled={disabled} onClick={() => onRemove(i)} aria-label={`Remove ${f.name}`} className="absolute right-0.5 top-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-[3px] text-[#5E6C84] hover:bg-[rgba(9,30,66,0.08)] disabled:opacity-40">
            <X className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
};
