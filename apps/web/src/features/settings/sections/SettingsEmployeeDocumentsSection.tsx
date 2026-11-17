import React, { useState } from 'react';
import { Lock, Pencil, Plus, Power, ShieldCheck, Trash2, X } from 'lucide-react';
import { RowActionsMenu, type RowAction } from '@/shared/ui/RowActionsMenu';
import {
  ChecklistDocument,
  useCreateChecklistDocumentMutation,
  useDeleteChecklistDocumentMutation,
  useDocumentChecklistQuery,
  useUpdateChecklistDocumentMutation,
} from '@/features/employees/hooks/use-document-checklist';

const GROUP_LABEL: Record<ChecklistDocument['category'], string> = {
  agreement: 'Agreement',
  given_to_employee: 'Given to employee',
  taken_from_employee: 'Taken from employee',
};

const input =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50';

const errorText = (err: unknown, fallback: string) => {
  const e = err as { message?: string; body?: { message?: string } } | undefined;
  return e?.body?.message || e?.message || fallback;
};

/**
 * Settings -> Employee Documents (Admin): the standard document checklist every employee gets, from
 * the database. Required documents must be complete before an employee can be activated. A one-off
 * document for a single employee is still added with "Add Document" on that employee's Documents tab.
 */
export const SettingsEmployeeDocumentsSection: React.FC = () => {
  const { data: docs = [], isLoading, error } = useDocumentChecklistQuery();
  const create = useCreateChecklistDocumentMutation();
  const update = useUpdateChecklistDocumentMutation();
  const remove = useDeleteChecklistDocumentMutation();

  const [editing, setEditing] = useState<ChecklistDocument | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [required, setRequired] = useState(false);
  const [order, setOrder] = useState(1);
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const flash = (m: string) => {
    setNotice(m);
    window.setTimeout(() => setNotice(''), 4000);
  };

  const openForm = (d: ChecklistDocument | null) => {
    setEditing(d);
    setTitle(d?.title ?? '');
    setRequired(d?.is_required_for_activation ?? false);
    setOrder(d?.display_order ?? (docs.length ? Math.max(...docs.map((x) => x.display_order)) + 1 : 1));
    setActive(d?.is_active ?? true);
    setFormError('');
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setFormError('Please fill the document name.');
    const dto = { title: title.trim(), is_required_for_activation: required, display_order: order, is_active: active };
    try {
      if (editing) await update.mutateAsync({ id: editing.checklist_id, dto });
      else await create.mutateAsync(dto);
      setOpen(false);
      flash(editing ? `${dto.title} saved.` : `${dto.title} added. New employees get it from now on.`);
    } catch (err) {
      setFormError(errorText(err, 'Could not save the document.'));
    }
  };

  const quick = async (d: ChecklistDocument, dto: { is_required_for_activation?: boolean; is_active?: boolean }, done: string) => {
    try {
      await update.mutateAsync({ id: d.checklist_id, dto });
      flash(done);
    } catch (err) {
      window.alert(errorText(err, 'Could not save the change.'));
    }
  };

  const onDelete = async (d: ChecklistDocument) => {
    const question = d.employees
      ? `${d.employees} employee${d.employees === 1 ? ' has' : 's have'} "${d.title}", so it will be switched off (new employees will not get it; existing ones keep it). Continue?`
      : `Delete "${d.title}" from the checklist?`;
    if (!window.confirm(question)) return;
    try {
      const r = (await remove.mutateAsync(d.checklist_id)) as { deleted: boolean };
      flash(r.deleted ? `${d.title} deleted.` : `${d.title} switched off.`);
    } catch (err) {
      window.alert(errorText(err, 'Could not remove the document.'));
    }
  };

  const actionsFor = (d: ChecklistDocument): RowAction[] => [
    { label: 'Edit', icon: Pencil, onClick: () => openForm(d) },
    {
      label: d.is_required_for_activation ? 'Make optional' : 'Make required',
      icon: ShieldCheck,
      disabled: d.lock_when_active,
      hint: 'Exit documents are issued when the employee leaves, so they cannot be required for activation.',
      onClick: () =>
        quick(d, { is_required_for_activation: !d.is_required_for_activation }, `${d.title} is now ${d.is_required_for_activation ? 'optional' : 'required'}.`),
    },
    {
      label: d.is_active ? 'Switch off' : 'Switch on',
      icon: Power,
      disabled: d.is_system,
      hint: 'Pulse makes this document itself, so it is always on.',
      onClick: () => quick(d, { is_active: !d.is_active }, `${d.title} switched ${d.is_active ? 'off' : 'on'}.`),
    },
    {
      label: 'Delete',
      icon: Trash2,
      danger: true,
      disabled: d.is_system,
      hint: 'Pulse makes this document itself, so it cannot be removed.',
      onClick: () => onDelete(d),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Employee Documents</h2>
          <p className="mt-0.5 max-w-2xl text-[13px] text-slate-500">
            The documents every employee has on their Documents tab. <b>Required</b> ones must be complete before the employee can be
            activated. Changing "required" applies to employees still onboarding. For one employee only, use "Add Document" on their
            Documents tab.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openForm(null)}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Document
        </button>
      </div>

      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">{notice}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">{errorText(error, 'Could not load the checklist.')}</div>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3">For activation</th>
              <th className="px-4 py-3">Employees</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">Loading documents...</td>
              </tr>
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">No documents yet. Click "Add Document".</td>
              </tr>
            ) : (
              docs.map((d) => (
                <tr key={d.checklist_id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-slate-500">{d.display_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      {d.title}
                      {d.is_system && (
                        <span title="Made by Pulse: always on" className="text-slate-400">
                          <Lock className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    {d.lock_when_active && <div className="text-[11px] text-slate-400">Issued when the employee leaves</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{GROUP_LABEL[d.category]}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        d.is_required_for_activation ? 'border border-blue-200 bg-blue-50 text-blue-700' : 'border border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      {d.is_required_for_activation ? 'Required' : 'Optional'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.employees || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        d.is_active ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-slate-200 bg-slate-100 text-slate-500'
                      }`}
                    >
                      {d.is_active ? 'On' : 'Off'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <RowActionsMenu label={`Actions for ${d.title}`} actions={actionsFor(d)} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">{editing ? 'Edit Document' : 'Add Document'}</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 transition hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={save} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Document name <span className="text-rose-500">*</span>
                </label>
                <input className={input} maxLength={150} placeholder="e.g. Driving Licence" value={title} onChange={(e) => setTitle(e.target.value)} />
                {!editing && <p className="mt-1 text-[11px] text-slate-500">Collected from the employee ("Taken from employee").</p>}
              </div>
              <label className={`flex items-start gap-2 ${editing?.lock_when_active ? 'opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={required}
                  disabled={editing?.lock_when_active}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-blue-600"
                />
                <span className="text-xs text-slate-700">
                  <b className="font-semibold">Required for activation</b>
                  <span className="block text-[11px] text-slate-500">The employee cannot be activated until this document is complete.</span>
                </span>
              </label>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Display order</label>
                <input className={input} type="number" min={1} value={order} onChange={(e) => setOrder(Number(e.target.value) || 1)} />
              </div>
              <label className={`flex items-center gap-2 pt-1 ${editing?.is_system ? 'opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={active}
                  disabled={editing?.is_system}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded-md border-slate-300 text-blue-600"
                />
                <span className="text-xs font-medium text-slate-700">New employees get this document</span>
              </label>
              {formError && <p className="text-xs text-rose-600">{formError}</p>}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={create.isPending || update.isPending}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {create.isPending || update.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
