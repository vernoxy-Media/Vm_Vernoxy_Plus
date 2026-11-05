import React, { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { leaveExportUrl, useLeaveLedgerQuery } from '../hooks/use-leave';
import { useAuthenticatedDownload } from '@/shared/hooks/use-authenticated-download';
import { Btn, Modal, errMessage, fmtDate, fmtDateTime, fmtDays, printTable } from './leave-ui';

const ENTRY_LABEL: Record<string, string> = {
  OPENING_BALANCE: 'Opening Balance',
  MONTHLY_CREDIT: 'Credit',
  YEARLY_CREDIT: 'Credit',
  PRO_RATA_CREDIT: 'Credit',
  CARRIED_FORWARD: 'Carried forward',
  LAPSED: 'Lapsed',
  COMP_OFF_CREDIT: 'Comp-off credit',
  TAKEN: 'Taken',
  RETURNED: 'Returned',
  ADJUSTED: 'Adjusted',
};

export const LeaveLedgerModal: React.FC<{
  open: boolean;
  onClose: () => void;
  empId?: number;
  employeeName?: string;
  yearOptions?: Array<{ value: number; label: string }>;
  defaultYear?: number;
  typeOptions?: Array<{ value: number; label: string }>;
}> = ({ open, onClose, empId, employeeName, yearOptions = [], defaultYear, typeOptions = [] }) => {
  const [year, setYear] = useState<number | undefined>(defaultYear);
  const [typeId, setTypeId] = useState<number | undefined>(undefined);
  const { data: rows = [], isLoading, error } = useLeaveLedgerQuery({ empId, year, typeId }, open);
  const { download, isDownloading } = useAuthenticatedDownload();
  const [dlError, setDlError] = useState('');

  const table = useMemo(
    () => ({
      title: `Leave Ledger${employeeName ? ` · ${employeeName}` : ''}`,
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'leave_type_name', label: 'Leave Type' },
        { key: 'entry', label: 'Entry' },
        { key: 'days', label: 'Days' },
        { key: 'balance_after', label: 'Balance after' },
        { key: 'note', label: 'Details' },
        { key: 'performed_by_name', label: 'By' },
      ],
      rows: rows.map((r) => ({
        ...r,
        date: fmtDateTime(r.performed_at),
        entry: ENTRY_LABEL[r.entry_type] || r.entry_type,
        days: `${r.days > 0 ? '+' : ''}${fmtDays(r.days)}`,
        balance_after: fmtDays(r.balance_after),
      })),
    }),
    [rows, employeeName],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-5xl"
      title="Leave Ledger"
      subtitle="Every credit and debit on the balance, with who, when and why. It can never be edited or deleted."
      footer={
        <>
          <Btn onClick={() => printTable(table, year ? `Leave year ${year}` : 'All years')} disabled={!rows.length}>
            <Printer className="w-3.5 h-3.5" /> PDF
          </Btn>
          <Btn
            loading={isDownloading}
            disabled={!rows.length}
            onClick={async () => {
              setDlError('');
              try {
                await download(leaveExportUrl('ledger/export', { empId, year, format: 'xlsx' }), 'leave-ledger.xlsx');
              } catch (e: any) {
                setDlError(errMessage(e));
              }
            }}
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </Btn>
          <Btn variant="primary" onClick={onClose}>
            Close
          </Btn>
        </>
      }
    >
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={year ?? ''}
          onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
        >
          <option value="">Year: All</option>
          {yearOptions.map((y) => (
            <option key={y.value} value={y.value}>
              Year: {y.label}
            </option>
          ))}
        </select>
        {typeOptions.length > 0 && (
          <select
            value={typeId ?? ''}
            onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            <option value="">Leave Type: All</option>
            {typeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {dlError && <p className="mb-2 text-rose-600">{dlError}</p>}
      {error && <p className="mb-2 text-rose-600">{errMessage(error)}</p>}
      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Leave Type</th>
              <th className="py-2.5 px-3">Entry</th>
              <th className="py-2.5 px-3 text-right">Days</th>
              <th className="py-2.5 px-3 text-right">Balance after</th>
              <th className="py-2.5 px-3">Details</th>
              <th className="py-2.5 px-3">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">No entries yet.</td>
              </tr>
            ) : (
              rows.map((e) => (
                <tr key={e.ledger_id}>
                  <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{fmtDateTime(e.performed_at)}</td>
                  <td className="py-2 px-3 font-semibold text-slate-800">{e.leave_type_name}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        e.days > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {ENTRY_LABEL[e.entry_type] || e.entry_type}
                    </span>
                  </td>
                  <td className={`py-2 px-3 text-right font-bold ${e.days > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {e.days > 0 ? '+' : ''}
                    {fmtDays(e.days)}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-slate-800">{fmtDays(e.balance_after)}</td>
                  <td className="py-2 px-3 text-slate-600">
                    {e.note}
                    {e.expiry_date && <span className="text-slate-400"> · expires {fmtDate(e.expiry_date)}</span>}
                  </td>
                  <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{e.performed_by_name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};
