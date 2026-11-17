import React, { useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { PayrollEmployeeItem, bankFileUrl, downloadFile, errorText, fieldErrors, useMarkPaidMutation } from '../hooks/use-payroll';
import { Banner, FieldError, Modal, btn, inputCls, money, todayIST } from './payroll-ui';

const MODE: Record<string, string> = { BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque', CASH: 'Cash' };

/** Mark as Paid (BFD 10 Part 3): all or the ticked employees; mode and reference per Payment Mode. */
export const MarkPaidModal: React.FC<{
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
  monthLabel: string;
  lockedAt: string | null;
  employees: PayrollEmployeeItem[];
}> = ({ open, onClose, year, month, monthLabel, lockedAt, employees }) => {
  const pay = useMarkPaidMutation();
  const unpaid = useMemo(() => employees.filter((e) => !e.is_paid), [employees]);
  const [selected, setSelected] = useState<number[]>([]);
  const [date, setDate] = useState(todayIST());
  const [batch, setBatch] = useState('');
  const [cheques, setCheques] = useState<Record<string, string>>({});
  const [cashRef, setCashRef] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const minDate = lockedAt ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(lockedAt)) : undefined;

  useEffect(() => {
    if (!open) return;
    setSelected(unpaid.map((e) => e.emp_id));
    setDate(todayIST());
    setBatch('');
    setCheques({});
    setCashRef('');
    setErrs({});
    setBanner(null);
  }, [open, unpaid]);

  const chosen = unpaid.filter((e) => selected.includes(e.emp_id));
  const bank = chosen.filter((e) => e.payment_mode === 'BANK_TRANSFER');
  const cheque = chosen.filter((e) => e.payment_mode === 'CHEQUE');
  const cash = chosen.filter((e) => e.payment_mode === 'CASH');
  const missingBank = bank.filter((e) => !e.account_number || !e.ifsc_code);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!date) e.payment_date = 'Please fill this field.';
    else if (date > todayIST()) e.payment_date = 'The payment date cannot be in the future.';
    else if (minDate && date < minDate) e.payment_date = 'The payment date cannot be before the lock date.';
    if (!chosen.length) e.emp_ids = 'Please select at least one employee.';
    if (bank.length && !batch.trim()) e.batch_reference = 'Please enter the bank batch reference.';
    if (cheque.some((c) => !cheques[String(c.emp_id)]?.trim())) e.cheque_numbers = 'Please enter a cheque number for every cheque payment.';
    if (Object.keys(e).length) return setErrs(e);
    setBanner(null);
    try {
      await pay.mutateAsync({
        year,
        month,
        data: { payment_date: date, emp_ids: chosen.map((c) => c.emp_id), batch_reference: batch.trim() || undefined, cheque_numbers: cheques, cash_reference: cashRef.trim() || undefined },
      });
      onClose();
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrs(fe);
      else setBanner(errorText(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={`Mark as Paid · ${monthLabel}`}
      subtitle="The run is Paid when every employee is paid."
      footer={
        <>
          <button
            type="button"
            className={`${btn.secondary} mr-auto`}
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);
              try {
                await downloadFile(bankFileUrl(year, month), `bank-file-${year}-${String(month).padStart(2, '0')}.csv`);
              } catch (e: any) {
                setBanner(e?.message || 'Download failed.');
              } finally {
                setDownloading(false);
              }
            }}
          >
            <Download className="h-4 w-4" /> Download bank file
          </button>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btn.success} disabled={pay.isPending} onClick={submit}>
            {pay.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Mark as Paid
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {banner && <Banner>{banner}</Banner>}
        {missingBank.length > 0 && (
          <Banner tone="warn">
            {missingBank.map((m) => m.employee_name).join(', ')}: bank account or IFSC missing. They are left out of the bank file; pay them by cheque or fill the bank details.
          </Banner>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Payment Date<span className="text-rose-500">*</span>
            </label>
            <input type="date" className={inputCls} value={date} min={minDate} max={todayIST()} onChange={(e) => setDate(e.target.value)} />
            <FieldError msg={errs.payment_date} />
          </div>
          {bank.length > 0 && (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Bank batch reference<span className="text-rose-500">*</span>
              </label>
              <input className={inputCls} maxLength={100} value={batch} onChange={(e) => setBatch(e.target.value)} />
              <FieldError msg={errs.batch_reference} />
            </div>
          )}
          {cash.length > 0 && (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cash reference</label>
              <input className={inputCls} maxLength={100} value={cashRef} onChange={(e) => setCashRef(e.target.value)} />
            </div>
          )}
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Paid for</p>
            <button type="button" className={btn.link} onClick={() => setSelected(selected.length === unpaid.length ? [] : unpaid.map((u) => u.emp_id))}>
              {selected.length === unpaid.length ? 'Clear' : 'Select all'}
            </button>
          </div>
          <FieldError msg={errs.emp_ids || errs.cheque_numbers} />
          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
            {unpaid.map((e) => (
              <div key={e.emp_id} className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 text-[12.5px] last:border-0">
                <input type="checkbox" checked={selected.includes(e.emp_id)} onChange={() => setSelected((s) => (s.includes(e.emp_id) ? s.filter((x) => x !== e.emp_id) : [...s, e.emp_id]))} />
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                  {e.employee_name} <span className="text-slate-400">· {MODE[e.payment_mode] || e.payment_mode}</span>
                </span>
                {e.payment_mode === 'CHEQUE' && selected.includes(e.emp_id) && (
                  <input
                    className="h-8 w-32 rounded-lg border border-slate-200 px-2 text-[12px]"
                    placeholder="Cheque no."
                    value={cheques[String(e.emp_id)] || ''}
                    onChange={(ev) => setCheques((c) => ({ ...c, [String(e.emp_id)]: ev.target.value }))}
                  />
                )}
                <span className="w-24 text-right font-semibold text-slate-900">{money(e.total_salary, 0)}</span>
              </div>
            ))}
            {!unpaid.length && <p className="px-3 py-6 text-center text-[12.5px] text-slate-500">Everyone is paid.</p>}
          </div>
          <p className="mt-1.5 text-right text-[12px] text-slate-500">
            {chosen.length} selected · {money(chosen.reduce((s, c) => s + c.total_salary, 0), 0)}
          </p>
        </div>
      </div>
    </Modal>
  );
};
