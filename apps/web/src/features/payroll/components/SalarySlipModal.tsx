import React, { useRef } from 'react';
import { Loader2, Printer } from 'lucide-react';
import { SalarySlip, errorText } from '../hooks/use-payroll';
import { Banner, Modal, btn, fmtStamp } from './payroll-ui';

/** Salary Slip from the Salary Slip template. "Print / Save as PDF" makes the PDF. */
export const SalarySlipModal: React.FC<{ open: boolean; onClose: () => void; slip: SalarySlip | undefined; loading?: boolean; error?: unknown; title?: string }> = ({
  open,
  onClose,
  slip,
  loading,
  error,
  title,
}) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const doc = slip ? `<!doctype html><html><head><meta charset="utf-8"><title>${slip.slip_number}</title><style>body{margin:24px;}@media print{body{margin:0;}}</style></head><body>${slip.content_html}</body></html>` : '';
  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-4xl"
      title={title || slip?.slip_number || 'Salary Slip'}
      subtitle={
        slip
          ? slip.preview
            ? 'Preview: slips are made after the lock.'
            : `${slip.status === 'RELEASED' ? `Released ${fmtStamp(slip.released_at)}${slip.released_to_email ? ` to ${slip.released_to_email}` : ''}` : slip.status === 'REPLACED' ? 'Replaced by a newer slip' : 'Generated, not released yet'}`
          : undefined
      }
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Close
          </button>
          <button type="button" className={btn.primary} disabled={!slip} onClick={() => frame.current?.contentWindow?.print()}>
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </button>
        </>
      }
    >
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <Banner>{errorText(error)}</Banner>
      ) : slip ? (
        <iframe ref={frame} title="Salary Slip" srcDoc={doc} className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white" />
      ) : null}
    </Modal>
  );
};
