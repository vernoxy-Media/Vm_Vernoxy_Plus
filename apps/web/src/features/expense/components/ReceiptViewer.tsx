import React, { useState } from 'react';
import { Download, FileText, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { ReceiptItem, downloadAllReceipts, receiptUrl } from '../hooks/use-expenses';
import { btn } from './expense-ui';

const isImage = (r: ReceiptItem) => /^image\//.test(r.mime_type || '') || /\.(png|jpe?g)$/i.test(r.file_name);

/** BFD 7 Part 1, Receipts: thumbnails, open large, zoom, rotate, Download all. */
export const ReceiptViewer: React.FC<{ receipts: ReceiptItem[]; claimId: number; claimNo: string | null }> = ({ receipts, claimId, claimNo }) => {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!receipts.length) return <p className="text-[12.5px] text-slate-400">No receipt attached.</p>;
  const cur = receipts[Math.min(active, receipts.length - 1)];

  const pick = (i: number) => {
    setActive(i);
    setZoom(1);
    setRotate(0);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {receipts.map((r, i) => (
          <button
            key={r.attachment_id}
            type="button"
            onClick={() => pick(i)}
            className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-slate-50 ${i === active ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'}`}
            title={r.file_name}
          >
            {isImage(r) ? <img src={receiptUrl(r.attachment_id)} alt={r.file_name} className="h-full w-full object-cover" /> : <FileText className="h-6 w-6 text-rose-500" />}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
          <span className="truncate text-xs font-semibold text-slate-600">{cur.file_name}</span>
          <div className="flex items-center gap-1">
            {isImage(cur) && (
              <>
                <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-white" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} aria-label="Zoom out">
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-white" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} aria-label="Zoom in">
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-white" onClick={() => setRotate((r) => (r + 90) % 360)} aria-label="Rotate">
                  <RotateCw className="h-4 w-4" />
                </button>
              </>
            )}
            <a href={receiptUrl(cur.attachment_id)} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-500 hover:bg-white" aria-label="Open">
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="flex h-80 items-center justify-center overflow-auto p-3">
          {isImage(cur) ? (
            <img
              src={receiptUrl(cur.attachment_id)}
              alt={cur.file_name}
              style={{ transform: `scale(${zoom}) rotate(${rotate}deg)`, transition: 'transform 150ms' }}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <iframe src={receiptUrl(cur.attachment_id)} title={cur.file_name} className="h-full w-full rounded-lg bg-white" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className={btn.secondary}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await downloadAllReceipts(claimId, claimNo);
            } catch (e: any) {
              setErr(e?.message || 'Download failed.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <Download className="h-4 w-4" /> {busy ? 'Preparing…' : 'Download all'}
        </button>
        {err && <span className="text-xs text-rose-600">{err}</span>}
      </div>
    </div>
  );
};
