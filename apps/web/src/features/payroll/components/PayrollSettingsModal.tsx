import React, { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { PayrollSettings, errorText, fieldErrors, useAddCategoryMutation, usePayrollSettingsQuery, useUpdateCategoryMutation, useUpdatePayrollSettingsMutation } from '../hooks/use-payroll';
import { Banner, FieldError, Modal, btn, inputCls } from './payroll-ui';

const L: React.FC<{ t: string; children: React.ReactNode; err?: string }> = ({ t, children, err }) => (
  <div>
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t}</label>
    {children}
    <FieldError msg={err} />
  </div>
);

/** Section 12: Payroll Settings. The Admin edits; Accounts can only view. */
export const PayrollSettingsModal: React.FC<{ open: boolean; onClose: () => void; canEdit: boolean }> = ({ open, onClose, canEdit }) => {
  const { data, isLoading, error } = usePayrollSettingsQuery(open);
  const { data: people = [] } = useEmployeeOptionsQuery();
  const save = useUpdatePayrollSettingsMutation();
  const addCat = useAddCategoryMutation();
  const updCat = useUpdateCategoryMutation();
  const [form, setForm] = useState<Partial<PayrollSettings>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [newCat, setNewCat] = useState<{ kind: 'ADDITION' | 'DEDUCTION'; label: string }>({ kind: 'ADDITION', label: '' });

  useEffect(() => {
    if (open && data) {
      setForm(data);
      setErrs({});
      setMsg(null);
    }
  }, [open, data]);

  const set = (k: keyof PayrollSettings, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const ro = !canEdit;

  const submit = async () => {
    const e: Record<string, string> = {};
    const pct = (v: any) => Number(v) >= 0 && Number(v) <= 100;
    if (!pct(form.default_employee_pf_pct)) e.default_employee_pf_pct = '0 to 100.';
    if (!pct(form.default_employer_pf_pct)) e.default_employer_pf_pct = '0 to 100.';
    if (form.apply_pf_wage_limit && !(Number(form.pf_wage_limit) > 0)) e.pf_wage_limit = 'More than 0. Required when the limit is applied.';
    if (!(Number(form.pay_day) >= 1 && Number(form.pay_day) <= 28)) e.pay_day = '1 to 28.';
    if (Object.keys(e).length) return setErrs(e);
    setMsg(null);
    try {
      await save.mutateAsync({
        default_employee_pf_pct: Number(form.default_employee_pf_pct),
        default_employer_pf_pct: Number(form.default_employer_pf_pct),
        apply_pf_wage_limit: Boolean(form.apply_pf_wage_limit),
        pf_wage_limit: Number(form.pf_wage_limit),
        missing_punch_default: form.missing_punch_default,
        ot_rounding: form.ot_rounding,
        total_salary_rounding: form.total_salary_rounding,
        pay_day: Number(form.pay_day),
        accounts_emp_ids: form.accounts_emp_ids,
        company_name: form.company_name ?? '',
        company_address: form.company_address ?? '',
      });
      setMsg({ tone: 'ok', text: 'Settings saved. New values apply to runs calculated from now; locked runs are not changed.' });
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrs(fe);
      else setMsg({ tone: 'error', text: errorText(err) });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-3xl"
      title="Payroll Settings"
      subtitle={canEdit ? 'Every change is kept in the Change Log.' : 'View only. The Admin edits these settings.'}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Close
          </button>
          {canEdit && (
            <button type="button" className={btn.primary} disabled={save.isPending} onClick={submit}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save Settings
            </button>
          )}
        </>
      }
    >
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error || !data ? (
        <Banner>{errorText(error)}</Banner>
      ) : (
        <div className="space-y-5">
          {msg && <Banner tone={msg.tone === 'ok' ? 'ok' : 'error'}>{msg.text}</Banner>}
          <fieldset disabled={ro} className="grid gap-3 sm:grid-cols-2">
            <L t="Payroll Month">
              <div className={`${inputCls} flex items-center bg-slate-50 text-slate-500`}>{data.payroll_month}</div>
            </L>
            <L t="Pay day (1–28)" err={errs.pay_day}>
              <input type="number" min={1} max={28} className={inputCls} value={form.pay_day ?? ''} onChange={(e) => set('pay_day', e.target.value)} />
            </L>
            <L t="Employee PF share %" err={errs.default_employee_pf_pct}>
              <input type="number" min={0} max={100} step="0.01" className={inputCls} value={form.default_employee_pf_pct ?? ''} onChange={(e) => set('default_employee_pf_pct', e.target.value)} />
            </L>
            <L t="Employer PF share %" err={errs.default_employer_pf_pct}>
              <input type="number" min={0} max={100} step="0.01" className={inputCls} value={form.default_employer_pf_pct ?? ''} onChange={(e) => set('default_employer_pf_pct', e.target.value)} />
            </L>
            <L t="Apply PF Wage Limit">
              <select className={inputCls} value={form.apply_pf_wage_limit ? 'yes' : 'no'} onChange={(e) => set('apply_pf_wage_limit', e.target.value === 'yes')}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </L>
            <L t="PF Wage Limit (₹)" err={errs.pf_wage_limit}>
              <input type="number" min={1} step="0.01" className={inputCls} value={form.pf_wage_limit ?? ''} disabled={ro || !form.apply_pf_wage_limit} onChange={(e) => set('pf_wage_limit', e.target.value)} />
            </L>
            <L t="Missing Punch at lock">
              <select className={inputCls} value={form.missing_punch_default} onChange={(e) => set('missing_punch_default', e.target.value)}>
                <option value="UNPAID">Unpaid</option>
                <option value="FULL">Full day</option>
              </select>
            </L>
            <L t="OT rounding">
              <select className={inputCls} value={form.ot_rounding} onChange={(e) => set('ot_rounding', e.target.value)}>
                <option value="THIRTY">Down to 30 minutes</option>
                <option value="FIFTEEN">Down to 15 minutes</option>
                <option value="NONE">None</option>
              </select>
            </L>
            <L t="Total Salary rounding">
              <select className={inputCls} value={form.total_salary_rounding} onChange={(e) => set('total_salary_rounding', e.target.value)}>
                <option value="NEAREST_RUPEE">Nearest rupee</option>
                <option value="NONE">None (2 decimals)</option>
              </select>
            </L>
            <L t="Full Day Hours (from Attendance Settings)">
              <div className={`${inputCls} flex items-center bg-slate-50 text-slate-500`}>{data.full_day_hours} hours</div>
            </L>
          </fieldset>

          <fieldset disabled={ro}>
            <L t="Accounts users (run payroll, see salary figures inside Payroll only)" err={errs.accounts_emp_ids}>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {(form.accounts_emp_ids || []).map((id) => (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[12px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                    {(people as any[]).find((p) => (p.emp_id ?? p.id) === id)?.name ?? data.accounts_users.find((u) => u.emp_id === id)?.name ?? `#${id}`}
                    {canEdit && (
                      <button type="button" className="text-indigo-400 hover:text-rose-600" onClick={() => set('accounts_emp_ids', (form.accounts_emp_ids || []).filter((x) => x !== id))}>
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {!(form.accounts_emp_ids || []).length && <span className="text-[12px] text-slate-400">No one yet. Only the Admin can run payroll.</span>}
              </div>
              {canEdit && (
                <select
                  className={inputCls}
                  value=""
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id && !(form.accounts_emp_ids || []).includes(id)) set('accounts_emp_ids', [...(form.accounts_emp_ids || []), id]);
                  }}
                >
                  <option value="">Add an employee…</option>
                  {(people as any[])
                    .filter((p) => !(form.accounts_emp_ids || []).includes(p.emp_id ?? p.id))
                    .map((p) => (
                      <option key={p.emp_id ?? p.id} value={p.emp_id ?? p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              )}
            </L>
          </fieldset>

          <fieldset disabled={ro} className="grid gap-3 sm:grid-cols-2">
            <L t="Company name (Salary Slip)">
              <input className={inputCls} maxLength={150} value={form.company_name ?? ''} onChange={(e) => set('company_name', e.target.value)} />
            </L>
            <L t="Company address (Salary Slip)">
              <input className={inputCls} maxLength={300} value={form.company_address ?? ''} onChange={(e) => set('company_address', e.target.value)} />
            </L>
          </fieldset>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Paid leave types (from Leave Management)</p>
            <div className="flex flex-wrap gap-1.5">
              {data.paid_leave_types.map((l) => (
                <span key={l.name} className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ${l.is_paid ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
                  {l.name} · {l.is_paid ? 'Paid' : 'Unpaid'}
                </span>
              ))}
              {!data.paid_leave_types.length && <span className="text-[12px] text-slate-400">—</span>}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Adjustment categories</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['ADDITION', 'DEDUCTION'] as const).map((k) => (
                <div key={k} className="rounded-xl border border-slate-200">
                  <p className="border-b border-slate-100 px-3 py-2 text-[12px] font-bold text-slate-700">{k === 'ADDITION' ? 'Additions' : 'Deductions'}</p>
                  <ul className="divide-y divide-slate-100">
                    {data.adjustment_categories
                      .filter((c) => c.kind === k)
                      .map((c) => (
                        <li key={c.category_id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[12.5px]">
                          <span className={c.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}>{c.label}</span>
                          {canEdit && (
                            <span className="flex gap-2">
                              <button
                                type="button"
                                className={btn.link}
                                onClick={() => {
                                  const label = window.prompt('Rename category', c.label)?.trim();
                                  if (label && label !== c.label) updCat.mutate({ id: c.category_id, data: { label } });
                                }}
                              >
                                Rename
                              </button>
                              <button type="button" className={btn.link} onClick={() => updCat.mutate({ id: c.category_id, data: { is_active: !c.is_active } })}>
                                {c.is_active ? 'Switch off' : 'Switch on'}
                              </button>
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
            {canEdit && (
              <div className="mt-2 flex flex-wrap gap-2">
                <select className={`${inputCls} w-36`} value={newCat.kind} onChange={(e) => setNewCat((n) => ({ ...n, kind: e.target.value as any }))}>
                  <option value="ADDITION">Addition</option>
                  <option value="DEDUCTION">Deduction</option>
                </select>
                <input className={`${inputCls} w-56`} placeholder="New category" value={newCat.label} onChange={(e) => setNewCat((n) => ({ ...n, label: e.target.value }))} />
                <button
                  type="button"
                  className={btn.secondary}
                  disabled={addCat.isPending || newCat.label.trim().length < 2}
                  onClick={async () => {
                    try {
                      await addCat.mutateAsync({ kind: newCat.kind, label: newCat.label.trim() });
                      setNewCat((n) => ({ ...n, label: '' }));
                    } catch (e) {
                      setMsg({ tone: 'error', text: errorText(e) });
                    }
                  }}
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-slate-400">A category in use cannot be deleted, only switched off.</p>
          </div>
        </div>
      )}
    </Modal>
  );
};
