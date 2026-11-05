import React, { useEffect, useMemo, useState } from 'react';
import {
  useAdjustLeaveBalanceMutation,
  useBulkAdjustLeaveBalanceMutation,
  useLeaveLookupsQuery,
  useLeaveTypesQuery,
} from '../hooks/use-leave';
import { useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { SearchableSelect } from '@/shared/ui/SearchableSelect';
import { Btn, FieldError, Modal, errMessage, fieldErrors } from './leave-ui';

const isHalfStep = (n: number) => Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;

export const AdjustBalanceModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onDone?: (msg: string) => void;
  presetEmpId?: number;
  presetTypeId?: number;
}> = ({ open, onClose, onDone, presetEmpId, presetTypeId }) => {
  const { data: lookups } = useLeaveLookupsQuery();
  const { data: types = [] } = useLeaveTypesQuery();
  const { data: employees = [] } = useEmployeeOptionsQuery();
  const mut = useAdjustLeaveBalanceMutation();
  const [empId, setEmpId] = useState<number | null>(null);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [days, setDays] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setEmpId(presetEmpId ?? null);
    setTypeId(presetTypeId ?? null);
    setDirection('CREDIT');
    setDays('');
    setNote('');
    setErrors({});
  }, [open, presetEmpId, presetTypeId]);

  const trackedTypes = types.filter((t) => t.balance_tracked);

  const submit = async () => {
    const e: Record<string, string> = {};
    const n = Number(days);
    if (!empId) e.emp_id = 'Please fill this field.';
    if (!typeId) e.leave_type_id = 'Please fill this field.';
    if (!days || !(n >= 0.5 && n <= 365) || !isHalfStep(n)) e.days = 'Days must be 0.5 to 365, in steps of 0.5.';
    const len = note.trim().length;
    if (len < 10 || len > 500) e.note = 'Please write a note of 10 to 500 characters.';
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await mut.mutateAsync({ emp_id: empId!, leave_type_id: typeId!, direction, days: n, note: note.trim() });
      onDone?.('Balance adjusted. The employee has been told.');
      onClose();
    } catch (err: any) {
      const fe = fieldErrors(err);
      setErrors(Object.keys(fe).length ? fe : { general: errMessage(err) });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-lg"
      title="Adjust Balance"
      subtitle="Saved in the Leave Ledger and the Employee Profile History."
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" loading={mut.isPending} onClick={submit}>
            Save adjustment
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {errors.general && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{errors.general}</div>}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Employee <span className="text-rose-500">*</span></label>
          <SearchableSelect
            options={(employees as any[]).map((e) => ({ value: e.emp_id, label: e.name, sublabel: e.email }))}
            value={empId}
            onChange={(v) => setEmpId(v ? Number(v) : null)}
            placeholder="Choose employee"
            disabled={Boolean(presetEmpId)}
          />
          <FieldError message={errors.emp_id} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Leave type <span className="text-rose-500">*</span></label>
          <select value={typeId ?? ''} onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <option value="">Select leave type</option>
            {trackedTypes.map((t) => (
              <option key={t.leave_type_id} value={t.leave_type_id}>
                {t.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.leave_type_id} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Credit or Debit <span className="text-rose-500">*</span></label>
            <div className="flex gap-4 pt-1.5">
              {(lookups?.leave_adjust_direction || []).map((o) => (
                <label key={o.value} className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="radio" checked={direction === o.value} onChange={() => setDirection(o.value as any)} className="accent-blue-600" />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Days <span className="text-rose-500">*</span></label>
            <input type="number" min={0.5} max={365} step={0.5} value={days} onChange={(e) => setDays(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
            <FieldError message={errors.days} />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Note <span className="text-rose-500">*</span> <span className="font-normal text-slate-400">10 to 500 characters</span>
          </label>
          <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" placeholder='e.g. "Hospital stay, approved by Director"' />
          <FieldError message={errors.note} />
        </div>
      </div>
    </Modal>
  );
};

export const BulkCreditModal: React.FC<{ open: boolean; onClose: () => void; onDone?: (msg: string) => void }> = ({ open, onClose, onDone }) => {
  const { data: types = [] } = useLeaveTypesQuery();
  const { data: employees = [] } = useEmployeeOptionsQuery();
  const mut = useBulkAdjustLeaveBalanceMutation();
  const [selected, setSelected] = useState<number[]>([]);
  const [filter, setFilter] = useState('');
  const [typeId, setTypeId] = useState<number | null>(null);
  const [days, setDays] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setFilter('');
    setTypeId(null);
    setDays('');
    setNote('');
    setErrors({});
  }, [open]);

  const list = useMemo(
    () => (employees as any[]).filter((e) => !filter || e.name.toLowerCase().includes(filter.toLowerCase())),
    [employees, filter],
  );

  const submit = async () => {
    const e: Record<string, string> = {};
    const n = Number(days);
    if (!selected.length) e.emp_ids = 'Please choose at least one employee.';
    if (!typeId) e.leave_type_id = 'Please fill this field.';
    if (!days || !(n >= 0.5 && n <= 365) || !isHalfStep(n)) e.days = 'Days must be 0.5 to 365, in steps of 0.5.';
    const len = note.trim().length;
    if (len < 10 || len > 500) e.note = 'Please write a note of 10 to 500 characters.';
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      const res = await mut.mutateAsync({ emp_ids: selected, leave_type_id: typeId!, days: n, note: note.trim() });
      onDone?.(
        `${res.credited} employee${res.credited === 1 ? '' : 's'} credited.${res.skipped.length ? ` ${res.skipped.length} skipped (type not in their policy or not active).` : ''}`,
      );
      onClose();
    } catch (err: any) {
      setErrors({ general: errMessage(err) });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-lg"
      title="Bulk credit"
      subtitle="Credit the same days of one leave type to several employees, with one note."
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" loading={mut.isPending} onClick={submit}>
            Credit {selected.length || ''} employee{selected.length === 1 ? '' : 's'}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {errors.general && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{errors.general}</div>}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-slate-700">Employees <span className="text-rose-500">*</span></label>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={list.length > 0 && list.every((e) => selected.includes(e.emp_id))}
                onChange={(ev) =>
                  setSelected(ev.target.checked ? Array.from(new Set([...selected, ...list.map((e) => e.emp_id)])) : selected.filter((id) => !list.some((e) => e.emp_id === id)))
                }
              />
              Select all shown
            </label>
          </div>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search employee" className="w-full mb-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs" />
          <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
            {list.map((e) => (
              <label key={e.emp_id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selected.includes(e.emp_id)}
                  onChange={(ev) => setSelected(ev.target.checked ? [...selected, e.emp_id] : selected.filter((x) => x !== e.emp_id))}
                />
                {e.name}
              </label>
            ))}
          </div>
          <FieldError message={errors.emp_ids} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Leave type <span className="text-rose-500">*</span></label>
            <select value={typeId ?? ''} onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
              <option value="">Select</option>
              {types.filter((t) => t.balance_tracked && t.status === 'ACTIVE').map((t) => (
                <option key={t.leave_type_id} value={t.leave_type_id}>
                  {t.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.leave_type_id} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Days <span className="text-rose-500">*</span></label>
            <input type="number" min={0.5} max={365} step={0.5} value={days} onChange={(e) => setDays(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
            <FieldError message={errors.days} />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Note <span className="text-rose-500">*</span> <span className="font-normal text-slate-400">10 to 500 characters</span>
          </label>
          <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" placeholder='e.g. "Special day off for the company anniversary"' />
          <FieldError message={errors.note} />
        </div>
      </div>
    </Modal>
  );
};
