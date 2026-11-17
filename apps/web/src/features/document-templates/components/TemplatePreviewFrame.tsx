import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useContainerWidth } from '@/shared/ui/useContainerWidth';

/** A4 at 96 dpi. */
const PAGE_W = 794;
const PAGE_H = 1123;

/**
 * Shows the HTML the API rendered, as one A4 page scaled to the available width. The page is drawn
 * at full size inside the frame, so "Print" prints exactly what is shown.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const TemplatePreviewFrame = forwardRef<HTMLIFrameElement, { html: string | null; loading: boolean; emptyText?: string | null; title?: string }>(
  ({ html, loading, emptyText, title = 'Template preview' }, ref) => {
  const [boxRef, width] = useContainerWidth<HTMLDivElement>();
  const scale = width > 0 ? Math.min(1, width / PAGE_W) : 1;
  const doc = html
    ? `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>html,body{margin:0;padding:0;background:#fff;}</style></head><body>${html}</body></html>`
    : '';

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm" style={{ height: PAGE_H * scale }}>
        {html ? (
          <iframe
            ref={ref}
            title={title}
            srcDoc={doc}
            style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left', border: 0, background: '#fff' }}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-[13px] text-slate-500">
            {loading ? 'Preparing the preview…' : emptyText || 'No preview yet.'}
          </div>
        )}
      </div>
      {loading && html && (
        <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-slate-500 shadow">
          <Loader2 className="h-3 w-3 animate-spin" /> Updating
        </div>
      )}
    </div>
  );
});
TemplatePreviewFrame.displayName = 'TemplatePreviewFrame';
