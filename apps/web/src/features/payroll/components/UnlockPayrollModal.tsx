import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { errorText, useUnlockPayrollMutation } from '../hooks/use-payroll';
import { Banner, FieldError, Modal, btn, inputCls } from './payroll-ui';

/** Unlock (Admin only, BFD 10 Part 3). The run goes back to Draft; Accounts are told. */
export const UnlockPayrollModal: React.FC<{ open: boolean; onClose: () => void; year: number; month: number; monthLabel: string }> = ({ open, onClose, year, month, monthLabel }) => {
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<string | null>(null);
  const unlock = useUnlockPayrollMutation();

  useEffect(() => {
    if (open) {
      setReason('');
      setErr(null);
      setFieldErr(null);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Unlock ${monthLabel}?`}
      subtitle="The run goes back to Draft. Released slips stay visible until replaced by new (-R1) slips after the next lock."
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={btn.danger}
            disabled={unlock.isPending}
            onClick={async () => {
              const r = reason.trim();
              if (r.length < 10) return setFieldErr('Please write at least 10 characters.');
              setErr(null);
              try {
                await unlock.mutateAsync({ year, month, reason: r });
                onClose();
              } catch (e) {
                setErr(errorText(e));
              }
            }}
          >
            {unlock.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Unlock
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {err && <Banner>{err}</Banner>}
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Reason<span className="text-rose-500">*</span>
        </label>
        <textarea rows={3} maxLength={250} className={`${inputCls} h-auto py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />
        <FieldError msg={fieldErr} />
      </div>
    </Modal>
  );
};
