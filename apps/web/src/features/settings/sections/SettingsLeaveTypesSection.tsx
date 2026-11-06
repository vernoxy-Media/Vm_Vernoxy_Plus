import React, { useEffect, useMemo, useState } from 'react';
import { CalendarOff, Plus, Edit2, Trash2, Copy, Info, X } from 'lucide-react';
import {
  LeavePolicy,
  LeavePolicyRule,
  LeaveType,
  useCopyLeavePolicyMutation,
  useCreateLeavePolicyMutation,
  useCreateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
  useLeaveGeneralSettingsQuery,
  useLeaveLookupsQuery,
  useLeavePoliciesQuery,
  useLeaveSettingsChangeLogQuery,
  useLeaveTypesQuery,
  useToggleLeaveTypeStatusMutation,
  useUpdateLeaveGeneralSettingsMutation,
  useUpdateLeavePolicyMutation,
  useUpdateLeaveTypeMutation,
} from '@/features/leave/hooks/use-leave';
import {
  Btn,
  ConfirmModal,
  FieldError,
  Modal,
  PaidTag,
  colorStyle,
  errMessage,
  fieldErrors,
  fmtDateTime,
} from '@/features/leave/components/leave-ui';

type Tab = 'types' | 'policies' | 'general' | 'changelog';

const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const numCls = 'w-16 px-1.5 py-1 rounded-lg border border-slate-200 text-xs text-right';

const Radio: React.FC<{ name: string; checked: boolean; onChange: () => void; label: string; disabled?: boolean }> = ({
  name, checked, onChange, label, disabled,
}) => (
  <label className={`inline-flex items-center gap-1.5 text-xs ${disabled ? 'text-slate-400' : 'text-slate-700 cursor-pointer'}`}>
    <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} className="accent-blue-600" />
    {label}
  </label>
);

// =============================================================================
// Leave Type form (Reference Screen 1)
// =============================================================================

const emptyType: Partial<LeaveType> = {
  name: '',
  code: '',
  is_paid: true,
  balance_tracked: true,
  half_day_allowed: true,
  applies_to: undefined,
  calendar_color: undefined,
  description: '',
  status: 'ACTIVE',
};

const LeaveTypeModal: React.FC<{ open: boolean; editing: LeaveType | null; onClose: () => void }> = ({ open, editing, onClose }) => {
  const { data: lookups } = useLeaveLookupsQuery();
  const createMut = useCreateLeaveTypeMutation();
  const updateMut = useUpdateLeaveTypeMutation();
  const [form, setForm] = useState<Partial<LeaveType>>(emptyType);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      editing
        ? { ...editing, description: editing.description || '' }
        : {
            ...emptyType,
            applies_to: (lookups?.leave_applies_to?.[0]?.value as any) || undefined,
            calendar_color: lookups?.leave_calendar_color?.[0]?.value,
          },
    );
  }, [open, editing, lookups]);

  const set = (patch: Partial<LeaveType>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    const e: Record<string, string> = {};
    const name = (form.name || '').trim();
    const code = (form.code || '').trim().toUpperCase();
    if (name.length < 3 || name.length > 50) e.name = 'Leave Type Name must be 3 to 50 characters.';
    if (!/^[A-Z]{2,5}$/.test(code)) e.code = 'Code must be 2 to 5 capital letters, such as CL.';
    if (!form.balance_tracked && form.is_paid) e.balance_tracked = 'Only an Unpaid leave type can be "No limit".';
    if (!form.applies_to) e.applies_to = 'Please fill this field.';
    if (!form.calendar_color) e.calendar_color = 'Please fill this field.';
    if ((form.description || '').length > 200) e.description = 'Description can be up to 200 characters.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const payload = {
      name,
      code,
      is_paid: form.is_paid,
      balance_tracked: form.balance_tracked,
      half_day_allowed: form.half_day_allowed,
      applies_to: form.applies_to,
      calendar_color: form.calendar_color,
      description: (form.description || '').trim(),
      status: form.status,
    };
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.leave_type_id, data: payload });
      else await createMut.mutateAsync(payload);
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
      width="max-w-2xl"
      title={editing ? 'Edit Leave Type' : 'Add Leave Type'}
      subtitle="Leave Settings · Leave Types"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} loading={createMut.isPending || updateMut.isPending}>
            Save Leave Type
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {errors.general && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{errors.general}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Leave Type Name <span className="text-rose-500">*</span></label>
            <input value={form.name || ''} maxLength={50} onChange={(e) => set({ name: e.target.value })} className={inputCls} />
            <FieldError message={errors.name} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Code <span className="text-rose-500">*</span></label>
            <input value={form.code || ''} maxLength={5} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} className={inputCls} />
            <FieldError message={errors.code} />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Paid or Unpaid <span className="text-rose-500">*</span></label>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Radio name="paid" checked={form.is_paid === true} onChange={() => set({ is_paid: true, balance_tracked: true })} label="Paid leave: the day is paid in Payroll" />
            <Radio name="paid" checked={form.is_paid === false} onChange={() => set({ is_paid: false })} label="Unpaid leave: the day is Loss of Pay (LOP)" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Balance tracked</label>
            <div className="flex gap-4">
              <Radio name="tracked" checked={form.balance_tracked === true} onChange={() => set({ balance_tracked: true })} label="Yes, needs balance" />
              <Radio name="tracked" checked={form.balance_tracked === false} onChange={() => set({ balance_tracked: false })} label="No limit" disabled={form.is_paid !== false} />
            </div>
            <FieldError message={errors.balance_tracked} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Half day allowed</label>
            <div className="flex gap-4">
              <Radio name="half" checked={form.half_day_allowed === true} onChange={() => set({ half_day_allowed: true })} label="Yes" />
              <Radio name="half" checked={form.half_day_allowed === false} onChange={() => set({ half_day_allowed: false })} label="No" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Applies to</label>
            <select value={form.applies_to || ''} onChange={(e) => set({ applies_to: e.target.value as any })} className={inputCls}>
              {(lookups?.leave_applies_to || []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <FieldError message={errors.applies_to} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Colour in calendar</label>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded ${colorStyle(form.calendar_color).dot}`} />
              <select value={form.calendar_color || ''} onChange={(e) => set({ calendar_color: e.target.value })} className={inputCls}>
                {(lookups?.leave_calendar_color || []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <FieldError message={errors.calendar_color} />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Description <span className="font-normal text-slate-400">optional · shown to employees on the Apply Leave form</span>
          </label>
          <input value={form.description || ''} maxLength={200} onChange={(e) => set({ description: e.target.value })} className={inputCls} />
          <FieldError message={errors.description} />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status</label>
          <div className="flex gap-4">
            <Radio name="status" checked={form.status === 'ACTIVE'} onChange={() => set({ status: 'ACTIVE' })} label="Active" />
            <Radio name="status" checked={form.status === 'INACTIVE'} onChange={() => set({ status: 'INACTIVE' })} label="Inactive" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px]">
          Changing Paid or Unpaid applies to leave requests submitted after saving. Requests already submitted keep the value they were submitted with.
        </div>
      </div>
    </Modal>
  );
};

// =============================================================================
// Leave Policy editor (Reference Screen 2)
// =============================================================================

const PolicyEditor: React.FC<{ open: boolean; editing: LeavePolicy | null; onClose: () => void }> = ({ open, editing, onClose }) => {
  const { data: lookups } = useLeaveLookupsQuery();
  const { data: types = [] } = useLeaveTypesQuery();
  const { data: general } = useLeaveGeneralSettingsQuery();
  const createMut = useCreatePolicyHook();
  const updateMut = useUpdateLeavePolicyMutation();
  const [name, setName] = useState('');
  const [proRata, setProRata] = useState(true);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [rules, setRules] = useState<LeavePolicyRule[]>([]);
  const [addTypeId, setAddTypeId] = useState<number | ''>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setAddTypeId('');
    setName(editing?.name || '');
    setProRata(editing ? editing.pro_rata : true);
    setStatus(editing?.status || 'ACTIVE');
    setRules(editing ? editing.rules.map((r) => ({ ...r })) : []);
  }, [open, editing]);

  const typeById = (id: number) => types.find((t) => t.leave_type_id === id);
  const available = types.filter((t) => t.status === 'ACTIVE' && !rules.some((r) => r.leave_type_id === t.leave_type_id));
  const creditOptions = lookups?.leave_credit_frequency || [];

  const addRule = () => {
    if (!addTypeId) return;
    const t = typeById(Number(addTypeId));
    if (!t) return;
    setRules([
      ...rules,
      {
        leave_type_id: t.leave_type_id,
        days_per_year: null,
        credit_frequency: (creditOptions.find((o) => o.value !== 'FROM_APPROVED_OT')?.value || creditOptions[0]?.value) as any,
        carry_forward_days: 0,
        max_at_once: null,
        min_notice_days: 0,
        backdated_days: 0,
        attachment_after_days: null,
        allowed_during_probation: true,
        comp_off_expiry_days: 90,
      },
    ]);
    setAddTypeId('');
  };

  const upd = (idx: number, patch: Partial<LeavePolicyRule>) => setRules(rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const num = (v: string) => (v === '' ? null : Number(v));

  const save = async () => {
    setError('');
    if (name.trim().length < 2) {
      setError('Please enter the policy name.');
      return;
    }
    const payload = {
      name: name.trim(),
      pro_rata: proRata,
      status,
      rules: rules.map((r) => ({
        leave_type_id: r.leave_type_id,
        days_per_year: r.days_per_year ?? undefined,
        credit_frequency: r.credit_frequency,
        carry_forward_days: r.carry_forward_days ?? 0,
        max_at_once: r.max_at_once ?? undefined,
        min_notice_days: r.min_notice_days ?? 0,
        backdated_days: r.backdated_days ?? 0,
        attachment_after_days: r.attachment_after_days ?? undefined,
        allowed_during_probation: r.allowed_during_probation,
        comp_off_expiry_days: r.comp_off_expiry_days ?? 90,
      })),
    };
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.policy_id, data: payload });
      else await createMut.mutateAsync(payload);
      onClose();
    } catch (err: any) {
      setError(errMessage(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-6xl"
      title={editing ? editing.name : 'New Leave Policy'}
      subtitle={`Leave Settings · Leave Policies · Leave year ${(lookups?.leave_year_start || []).find((o) => o.value === general?.leave_year_start)?.label || ''}`}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} loading={createMut.isPending || updateMut.isPending}>
            Save Policy
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Policy name <span className="text-rose-500">*</span></label>
            <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div className="rounded-xl border border-slate-200 p-2.5">
            <div className="text-[11px] font-semibold text-slate-700">Pro-rata</div>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 mt-1 cursor-pointer">
              <input type="checkbox" checked={proRata} onChange={(e) => setProRata(e.target.checked)} /> For joiners, from the Joining Date
            </label>
          </div>
          <div className="rounded-xl border border-slate-200 p-2.5">
            <div className="text-[11px] font-semibold text-slate-700">{editing ? `${editing.employees_count} employees on this policy` : 'Status'}</div>
            <div className="flex gap-3 mt-1">
              <Radio name="pstatus" checked={status === 'ACTIVE'} onChange={() => setStatus('ACTIVE')} label="Active" />
              <Radio name="pstatus" checked={status === 'INACTIVE'} onChange={() => setStatus('INACTIVE')} label="Inactive" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">Leave types in this policy</span>
            <div className="flex items-center gap-2">
              <select value={addTypeId} onChange={(e) => setAddTypeId(e.target.value ? Number(e.target.value) : '')} className="px-2 py-1 rounded-lg border border-slate-200 text-xs">
                <option value="">Choose an Active leave type</option>
                {available.map((t) => (
                  <option key={t.leave_type_id} value={t.leave_type_id}>{t.name}</option>
                ))}
              </select>
              <button type="button" onClick={addRule} disabled={!addTypeId} className="text-xs font-semibold text-blue-600 disabled:text-slate-300 cursor-pointer">
                + Add leave type to policy
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2">Leave Type</th>
                  <th className="text-left px-2 py-2">Paid</th>
                  <th className="text-right px-2 py-2">Per year</th>
                  <th className="text-left px-2 py-2">Credit</th>
                  <th className="text-right px-2 py-2">Carry fwd</th>
                  <th className="text-right px-2 py-2">Max at once</th>
                  <th className="text-right px-2 py-2">Notice</th>
                  <th className="text-right px-2 py-2">Backdated</th>
                  <th className="text-right px-2 py-2">Attach &gt; days</th>
                  <th className="text-center px-2 py-2">Probation</th>
                  <th className="text-right px-2 py-2">Comp-off expiry</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-6 text-center text-slate-400">Add the leave types employees on this policy can take.</td>
                  </tr>
                )}
                {rules.map((r, idx) => {
                  const t = typeById(r.leave_type_id);
                  const tracked = t?.balance_tracked !== false;
                  const fromOt = r.credit_frequency === 'FROM_APPROVED_OT';
                  return (
                    <tr key={r.leave_type_id}>
                      <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">
                        {t?.name || r.leave_type_name} ({t?.code || r.leave_type_code})
                        {t?.status === 'INACTIVE' && <span className="ml-1 text-[10px] text-slate-400">Inactive</span>}
                      </td>
                      <td className="px-2 py-2"><PaidTag paid={t?.is_paid ?? Boolean(r.is_paid)} /></td>
                      <td className="px-2 py-2 text-right">
                        {tracked && !fromOt ? (
                          <input type="number" min={0} max={365} step={0.5} value={r.days_per_year ?? ''} onChange={(e) => upd(idx, { days_per_year: num(e.target.value) })} className={numCls} />
                        ) : (
                          <span className="text-slate-400">{tracked ? '—' : 'No limit'}</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {tracked ? (
                          <select value={r.credit_frequency} onChange={(e) => upd(idx, { credit_frequency: e.target.value as any })} className="px-1.5 py-1 rounded-lg border border-slate-200 text-xs">
                            {creditOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {tracked ? <input type="number" min={0} step={0.5} value={r.carry_forward_days ?? 0} onChange={(e) => upd(idx, { carry_forward_days: Number(e.target.value || 0) })} className={numCls} /> : '—'}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input type="number" min={0.5} step={0.5} placeholder="No limit" value={r.max_at_once ?? ''} onChange={(e) => upd(idx, { max_at_once: num(e.target.value) })} className={numCls} />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input type="number" min={0} step={1} value={r.min_notice_days ?? 0} onChange={(e) => upd(idx, { min_notice_days: Number(e.target.value || 0) })} className={numCls} />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input type="number" min={0} step={1} value={r.backdated_days ?? 0} onChange={(e) => upd(idx, { backdated_days: Number(e.target.value || 0) })} className={numCls} />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input type="number" min={0} step={0.5} placeholder="Never" value={r.attachment_after_days ?? ''} onChange={(e) => upd(idx, { attachment_after_days: num(e.target.value) })} className={numCls} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input type="checkbox" checked={r.allowed_during_probation} onChange={(e) => upd(idx, { allowed_during_probation: e.target.checked })} title="Allowed during probation" />
                      </td>
                      <td className="px-2 py-2 text-right">
                        {fromOt ? (
                          <input type="number" min={1} step={1} value={r.comp_off_expiry_days ?? 90} onChange={(e) => upd(idx, { comp_off_expiry_days: Number(e.target.value || 90) })} className={numCls} />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button type="button" onClick={() => setRules(rules.filter((_, i) => i !== idx))} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer" title="Remove from policy">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex items-start gap-1.5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px]">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          New rules apply from the time of saving: days already credited and requests already submitted keep their values, and the next credit uses the new rule.
          Paid or Unpaid comes from the Leave Type and cannot be changed here.
        </div>
      </div>
    </Modal>
  );
};

function useCreatePolicyHook() {
  return useCreateLeavePolicyMutation();
}

// =============================================================================
// Section
// =============================================================================

export const SettingsLeaveTypesSection: React.FC = () => {
  const [tab, setTab] = useState<Tab>('types');
  const { data: lookups } = useLeaveLookupsQuery();
  const { data: types = [] } = useLeaveTypesQuery();
  const { data: policies = [] } = useLeavePoliciesQuery();
  const { data: general } = useLeaveGeneralSettingsQuery();
  const { data: changeLog = [] } = useLeaveSettingsChangeLogQuery(tab === 'changelog');
  const toggleMut = useToggleLeaveTypeStatusMutation();
  const deleteMut = useDeleteLeaveTypeMutation();
  const copyMut = useCopyLeavePolicyMutation();
  const updateGeneralMut = useUpdateLeaveGeneralSettingsMutation();

  const [typeModal, setTypeModal] = useState<{ open: boolean; editing: LeaveType | null }>({ open: false, editing: null });
  const [policyModal, setPolicyModal] = useState<{ open: boolean; editing: LeavePolicy | null }>({ open: false, editing: null });
  const [deleteType, setDeleteType] = useState<LeaveType | null>(null);
  const [copySource, setCopySource] = useState<LeavePolicy | null>(null);
  const [copyName, setCopyName] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [generalForm, setGeneralForm] = useState<any>(null);

  useEffect(() => {
    if (general) setGeneralForm({ ...general });
  }, [general]);

  const flash = (ok: boolean, text: string) => {
    setMessage({ ok, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const label = (type: keyof NonNullable<typeof lookups>, value: string) =>
    (lookups?.[type] || []).find((o) => o.value === value)?.label || value;

  const tabBtn = (id: Tab, text: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${tab === id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
    >
      {text}
    </button>
  );

  const generalChanged = useMemo(
    () => general && generalForm && JSON.stringify(general) !== JSON.stringify(generalForm),
    [general, generalForm],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarOff className="w-6 h-6 text-blue-600" /> Leave Settings
          </h2>
          <p className="text-sm text-slate-500 mt-1">Leave Types, Leave Policies and General settings. Every change is kept in the Change Log.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          {tabBtn('types', 'Leave Types')}
          {tabBtn('policies', 'Leave Policies')}
          {tabBtn('general', 'General')}
          {tabBtn('changelog', 'Change Log')}
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-xs border ${message.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {message.text}
        </div>
      )}

      {/* ------------------------------------------------------------ Types */}
      {tab === 'types' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-900">Leave Types</span>
            <Btn variant="primary" onClick={() => setTypeModal({ open: true, editing: null })}>
              <Plus className="w-4 h-4" /> Add Leave Type
            </Btn>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Leave Type</th>
                  <th className="px-3 py-2.5">Code</th>
                  <th className="px-3 py-2.5">Paid or Unpaid</th>
                  <th className="px-3 py-2.5">Balance</th>
                  <th className="px-3 py-2.5">Half day</th>
                  <th className="px-3 py-2.5">Applies to</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {types.map((t) => (
                  <tr key={t.leave_type_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 font-semibold text-slate-800">
                        <span className={`w-2.5 h-2.5 rounded-sm ${colorStyle(t.calendar_color).dot}`} /> {t.name}
                      </div>
                      {t.description && <div className="text-[11px] text-slate-400 mt-0.5">{t.description}</div>}
                    </td>
                    <td className="px-3 py-2.5 font-mono">{t.code}</td>
                    <td className="px-3 py-2.5"><PaidTag paid={t.is_paid} /></td>
                    <td className="px-3 py-2.5">{t.balance_tracked ? 'Tracked' : 'No limit'}</td>
                    <td className="px-3 py-2.5">{t.half_day_allowed ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2.5">{label('leave_applies_to', t.applies_to)}</td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await toggleMut.mutateAsync(t.leave_type_id);
                          } catch (e: any) {
                            flash(false, errMessage(e));
                          }
                        }}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer ${
                          t.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                        title="Click to change"
                      >
                        {t.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button type="button" onClick={() => setTypeModal({ open: true, editing: t })} className="p-1.5 text-slate-500 hover:text-blue-600 cursor-pointer" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!t.is_used && (
                        <button type="button" onClick={() => setDeleteType(t)} className="p-1.5 text-slate-500 hover:text-rose-600 cursor-pointer" title="Delete (never used)">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ Policies */}
      {tab === 'policies' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Btn variant="primary" onClick={() => setPolicyModal({ open: true, editing: null })}>
              <Plus className="w-4 h-4" /> New Leave Policy
            </Btn>
          </div>
          {policies.map((p) => (
            <div key={p.policy_id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {p.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {p.employees_count} employees on this policy · Pro-rata {p.pro_rata ? 'on' : 'off'} · Leave year {label('leave_year_start', general?.leave_year_start || '')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Btn onClick={() => { setCopySource(p); setCopyName(`${p.name} (Copy)`); }}>
                    <Copy className="w-3.5 h-3.5" /> Copy Policy
                  </Btn>
                  <Btn onClick={() => setPolicyModal({ open: true, editing: p })}>
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Btn>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="text-left px-4 py-2">Leave Type</th>
                      <th className="text-left px-2 py-2">Paid</th>
                      <th className="text-left px-2 py-2">Per year</th>
                      <th className="text-left px-2 py-2">Credit</th>
                      <th className="text-left px-2 py-2">Carry fwd</th>
                      <th className="text-left px-2 py-2">Max at once</th>
                      <th className="text-left px-2 py-2">Notice</th>
                      <th className="text-left px-2 py-2">Backdated</th>
                      <th className="text-left px-2 py-2">Attachment</th>
                      <th className="text-left px-2 py-2">Probation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {p.rules.map((r) => (
                      <tr key={r.leave_type_id}>
                        <td className="px-4 py-2 font-semibold text-slate-800">{r.leave_type_name} ({r.leave_type_code})</td>
                        <td className="px-2 py-2"><PaidTag paid={Boolean(r.is_paid)} /></td>
                        <td className="px-2 py-2">{r.balance_tracked === false ? 'No limit' : r.days_per_year ?? '—'}</td>
                        <td className="px-2 py-2">
                          {r.balance_tracked === false
                            ? '—'
                            : r.credit_frequency === 'MONTHLY' && r.days_per_year
                              ? `${Math.round((Number(r.days_per_year) / 12) * 100) / 100} per month`
                              : label('leave_credit_frequency', r.credit_frequency)}
                        </td>
                        <td className="px-2 py-2">{r.carry_forward_days ? `Up to ${r.carry_forward_days}` : 'No'}</td>
                        <td className="px-2 py-2">{r.max_at_once ?? '—'}</td>
                        <td className="px-2 py-2">{r.min_notice_days ? `${r.min_notice_days} day${r.min_notice_days === 1 ? '' : 's'}` : '—'}</td>
                        <td className="px-2 py-2">{r.backdated_days ? `${r.backdated_days} days` : 'No'}</td>
                        <td className="px-2 py-2">{r.attachment_after_days != null ? `More than ${r.attachment_after_days} days` : 'Never'}</td>
                        <td className="px-2 py-2">{r.allowed_during_probation ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------ General */}
      {tab === 'general' && generalForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Leave Year</label>
              <select
                value={generalForm.leave_year_start}
                disabled={general?.leave_year_locked}
                onChange={(e) => setGeneralForm({ ...generalForm, leave_year_start: e.target.value })}
                className={`${inputCls} disabled:bg-slate-50`}
              >
                {(lookups?.leave_year_start || []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {general?.leave_year_locked && <p className="text-[10px] text-slate-400 mt-1">Can be changed only before the first leave year is opened.</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Year-end processing</label>
              <select value={generalForm.year_end_processing} onChange={(e) => setGeneralForm({ ...generalForm, year_end_processing: e.target.value })} className={inputCls}>
                {(lookups?.leave_year_end_processing || []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pending reminder (hours)</label>
              <input type="number" min={1} max={720} value={generalForm.pending_reminder_hours} onChange={(e) => setGeneralForm({ ...generalForm, pending_reminder_hours: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Comp-off from OT (hours that make one day)</label>
              <input type="number" min={1} max={24} step={0.5} value={generalForm.comp_off_hours_per_day} onChange={(e) => setGeneralForm({ ...generalForm, comp_off_hours_per_day: Number(e.target.value) })} className={inputCls} />
              <p className="text-[10px] text-slate-400 mt-1">Half of it makes half a day.</p>
            </div>
          </div>
          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={generalForm.count_sandwich_leave} onChange={(e) => setGeneralForm({ ...generalForm, count_sandwich_leave: e.target.checked })} className="mt-0.5" />
            <span>
              <span className="font-semibold text-slate-800 block">Count Weekly Offs and Holidays inside a leave ("sandwich" rule)</span>
              <span className="text-slate-500">Off: they are not Leave Days. On: they are counted.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={generalForm.approve_after_leave_started} onChange={(e) => setGeneralForm({ ...generalForm, approve_after_leave_started: e.target.checked })} className="mt-0.5" />
            <span>
              <span className="font-semibold text-slate-800 block">Approve after the leave has started</span>
              <span className="text-slate-500">Lets the Admin approve a Pending request whose first day has passed.</span>
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Btn onClick={() => setGeneralForm({ ...general })} disabled={!generalChanged}>Reset</Btn>
            <Btn
              variant="primary"
              disabled={!generalChanged}
              loading={updateGeneralMut.isPending}
              onClick={async () => {
                try {
                  await updateGeneralMut.mutateAsync({
                    leave_year_start: generalForm.leave_year_start,
                    count_sandwich_leave: generalForm.count_sandwich_leave,
                    pending_reminder_hours: generalForm.pending_reminder_hours,
                    approve_after_leave_started: generalForm.approve_after_leave_started,
                    year_end_processing: generalForm.year_end_processing,
                    comp_off_hours_per_day: generalForm.comp_off_hours_per_day,
                  });
                  flash(true, 'General settings saved.');
                } catch (e: any) {
                  flash(false, errMessage(e));
                }
              }}
            >
              Save General settings
            </Btn>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ Change Log */}
      {tab === 'changelog' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5">When</th>
                <th className="px-3 py-2.5">Who</th>
                <th className="px-3 py-2.5">Setting</th>
                <th className="px-3 py-2.5">Field</th>
                <th className="px-3 py-2.5">Old value</th>
                <th className="px-3 py-2.5">New value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {changeLog.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">No changes recorded yet.</td></tr>
              ) : (
                changeLog.map((c) => (
                  <tr key={c.log_id}>
                    <td className="px-4 py-2 whitespace-nowrap text-slate-600">{fmtDateTime(c.changed_at)}</td>
                    <td className="px-3 py-2 text-slate-700">{c.changed_by_name || '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{c.entity_name || c.entity_type}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{c.field_name}</td>
                    <td className="px-3 py-2 text-slate-500 max-w-[220px] truncate" title={c.old_value || ''}>{c.old_value ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-800 max-w-[220px] truncate" title={c.new_value || ''}>{c.new_value || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <LeaveTypeModal open={typeModal.open} editing={typeModal.editing} onClose={() => setTypeModal({ open: false, editing: null })} />
      <PolicyEditor open={policyModal.open} editing={policyModal.editing} onClose={() => setPolicyModal({ open: false, editing: null })} />

      <ConfirmModal
        open={Boolean(deleteType)}
        title={`Delete ${deleteType?.name}?`}
        message="This leave type has never been used, so it can be deleted. A type that has been used can only be made Inactive."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMut.isPending}
        onCancel={() => setDeleteType(null)}
        onConfirm={async () => {
          if (!deleteType) return;
          try {
            await deleteMut.mutateAsync(deleteType.leave_type_id);
            flash(true, `${deleteType.name} was deleted.`);
          } catch (e: any) {
            flash(false, errMessage(e));
          }
          setDeleteType(null);
        }}
      />

      <Modal
        open={Boolean(copySource)}
        onClose={() => setCopySource(null)}
        width="max-w-md"
        title="Copy Policy"
        subtitle={copySource ? `Make a new policy from ${copySource.name}` : ''}
        footer={
          <>
            <Btn onClick={() => setCopySource(null)}>Cancel</Btn>
            <Btn
              variant="primary"
              loading={copyMut.isPending}
              onClick={async () => {
                if (!copySource) return;
                try {
                  await copyMut.mutateAsync({ id: copySource.policy_id, new_name: copyName.trim() });
                  flash(true, `${copyName.trim()} created.`);
                  setCopySource(null);
                } catch (e: any) {
                  flash(false, errMessage(e));
                }
              }}
            >
              Copy
            </Btn>
          </>
        }
      >
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">New policy name <span className="text-rose-500">*</span></label>
        <input value={copyName} onChange={(e) => setCopyName(e.target.value)} className={inputCls} />
      </Modal>
    </div>
  );
};
