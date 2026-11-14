import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, Loader2 } from 'lucide-react';
import { ExportSpec, exportCsv, exportExcel, exportPdf } from '@/shared/utils/table-export';

/** "Export ▾" with Excel, PDF and CSV of the rows on screen (BFD 3, 8, 12). */
export const ExportMenu: React.FC<{
  build: () => ExportSpec | Promise<ExportSpec>;
  formats?: Array<'excel' | 'pdf' | 'csv'>;
  disabled?: boolean;
}> = ({ build, formats = ['excel', 'pdf', 'csv'], disabled }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const run = async (kind: 'excel' | 'pdf' | 'csv') => {
    setOpen(false);
    setErr('');
    setBusy(true);
    try {
      const spec = await build();
      if (!spec.rows.length) throw new Error('Nothing to export with these filters.');
      if (kind === 'excel') await exportExcel(spec);
      else if (kind === 'pdf') exportPdf(spec);
      else exportCsv(spec);
    } catch (e: any) {
      setErr(e?.message || 'Export failed.');
      setTimeout(() => setErr(''), 4000);
    } finally {
      setBusy(false);
    }
  };

  const label = { excel: 'Excel (.xlsx)', pdf: 'PDF', csv: 'CSV' };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-slate-500" />}
        Export
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {formats.map((f) => (
            <button key={f} type="button" onClick={() => void run(f)} className="block w-full px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50">
              {label[f]}
            </button>
          ))}
        </div>
      )}
      {err && <div className="absolute right-0 z-30 mt-1.5 w-64 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700 shadow">{err}</div>}
    </div>
  );
};
