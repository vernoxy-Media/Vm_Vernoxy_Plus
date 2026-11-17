import React from 'react';
import { printHtmlDocument } from '@/shared/utils/print-html';
import { TemplatePreviewFrame } from '@/features/document-templates/components/TemplatePreviewFrame';
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
  // Printed from a full-size A4 frame; "Save as PDF" in the print dialog downloads it, named after the slip.
  const print = () => slip && printHtmlDocument(slip.content_html, `Salary Slip ${slip.slip_number.replace(/[\/:*?"<>|]+/g, '-')}`);
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
          <button type="button" className={btn.primary} disabled={!slip} onClick={print}>
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
        <div className="max-h-[70vh] overflow-y-auto">
          <TemplatePreviewFrame html={slip.content_html} loading={false} title={`Salary Slip ${slip.slip_number}`} />
        </div>
      ) : null}
    </Modal>
  );
};
