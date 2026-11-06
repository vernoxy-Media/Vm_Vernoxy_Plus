import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Copy, Eye, Lock, Pencil, Plus, Search, Send, Trash2, Undo2, X } from 'lucide-react';
import {
  CycleType,
  PerfCycleItem,
  PerfFormItem,
  PerfQuestionItem,
  QuestionType,
  perfErrMessage,
  perfFieldErrors,
  useCreatePerfCycleMutation,
  useCyclePreviewQuery,
  useDeletePerfCycleMutation,
  useDeletePerfFormMutation,
  useFixedQuestionsQuery,
  useFormCoverageQuery,
  usePerfCyclesQuery,
  usePerfFormsQuery,
  usePublishPerfFormMutation,
  useSavePerfFormMutation,
  useUpdatePerfCycleMutation,
} from '@/features/performance/hooks/use-performance';
import { useDepartmentOptionsQuery } from '@/features/organization/hooks/use-organization';
import { RowActionsMenu } from '@/shared/ui/RowActionsMenu';
import { StarRating } from '@/features/performance/components/StarRating';
import { Banner, CycleStatusBadge, ErrorNote, PerfModal, btn, fmtDate, inputCls, windowLabel } from '@/features/performance/components/perf-ui';

const TYPES: Array<{ value: CycleType; label: string }> = [
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'MONTHLY', label: 'Monthly' },
];
const TYPE_LABEL: Record<string, string> = { YEARLY: 'Yearly', QUARTERLY: 'Quarterly', MONTHLY: 'Monthly' };
const QUARTERS = ['Jan to Mar', 'Apr to Jun', 'Jul to Sep', 'Oct to Dec'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ANSWER_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'SHORT_ANSWER', label: 'Short answer' },
  { value: 'SINGLE_CHOICE', label: 'Single choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple choice' },
  { value: 'STAR_RATING', label: 'Star rating' },
];
const LABEL = 'mb-1 block text-xs font-semibold text-slate-700';

function yearOptions() {
  const y = new Date().getFullYear();
  return [y - 1, y, y + 1, y + 2];
}

export const SettingsPerformanceSection: React.FC = () => {
  const location = useLocation();
  return location.pathname.includes('performance-forms') ? <QuestionMaster /> : <CycleMaster />;
};

// =============================================================================
// Cycle Master (Screens 1 and 2)
// =============================================================================

const CycleMaster: React.FC = () => {
  const [draft, setDraft] = useState({ search: '', cycle_type: '', year: '', status: '' });
  const [filters, setFilters] = useState(draft);
  const { data: cycles = [], isLoading } = usePerfCyclesQuery({
    search: filters.search || undefined,
    cycle_type: filters.cycle_type || undefined,
    year: filters.year ? Number(filters.year) : undefined,
    status: filters.status || undefined,
  });
  const del = useDeletePerfCycleMutation();
  const [editing, setEditing] = useState<PerfCycleItem | 'new' | null>(null);
  const [viewing, setViewing] = useState<PerfCycleItem | null>(null);
  const [deleting, setDeleting] = useState<PerfCycleItem | null>(null);
  const [delError, setDelError] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Cycle Master</h2>
          <p className="text-xs text-slate-500">Create and manage yearly, quarterly and monthly performance cycles.</p>
        </div>
        <button type="button" className={btn.primary} onClick={() => setEditing('new')}>
          <Plus className="w-3.5 h-3.5" /> Add Cycle
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className={LABEL}>Search cycle</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} placeholder="Cycle name" className={`${inputCls} pl-8`} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Cycle Type</label>
          <select value={draft.cycle_type} onChange={(e) => setDraft({ ...draft, cycle_type: e.target.value })} className={inputCls}>
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Year</label>
          <select value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })} className={inputCls}>
            <option value="">All years</option>
            {yearOptions().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Status</label>
          <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={inputCls}>
            <option value="">All statuses</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="REVIEW_OPEN">Review Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btn.primary} onClick={() => setFilters(draft)}>
            Apply
          </button>
          <button
            type="button"
            className={btn.secondary}
            onClick={() => {
              const empty = { search: '', cycle_type: '', year: '', status: '' };
              setDraft(empty);
              setFilters(empty);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-900">Cycles</span>
          <span className="text-[11px] text-slate-500">{cycles.length} records</span>
        </div>
        <table className="w-full text-xs min-w-[760px]">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Cycle Name</th>
              <th className="text-left px-3 py-3">Cycle Type</th>
              <th className="text-left px-3 py-3">Cycle Period</th>
              <th className="text-left px-3 py-3">Review Window</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && cycles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No cycles found.
                </td>
              </tr>
            )}
            {cycles.map((c) => (
              <tr key={c.cycle_id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-semibold text-slate-800">{c.cycle_name}</td>
                <td className="px-3 py-3">{TYPE_LABEL[c.cycle_type]}</td>
                <td className="px-3 py-3">{windowLabel(c.start_date, c.end_date)}</td>
                <td className="px-3 py-3">{windowLabel(c.review_start_date, c.review_end_date)}</td>
                <td className="px-3 py-3">
                  <CycleStatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <RowActionsMenu
                    actions={[
                      { label: 'View', icon: Eye, onClick: () => setViewing(c) },
                      ...(c.can_edit ? [{ label: 'Edit', icon: Pencil, onClick: () => setEditing(c) }] : []),
                      ...(c.can_edit && !c.reviews_count
                        ? [{ label: 'Delete', icon: Trash2, danger: true, onClick: () => { setDelError(''); setDeleting(c); } }]
                        : []),
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <CycleModal cycle={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {viewing && (
        <PerfModal title={viewing.cycle_name} onClose={() => setViewing(null)}>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <Info label="Cycle Type" value={TYPE_LABEL[viewing.cycle_type]} />
            <Info label="Status" value={<CycleStatusBadge status={viewing.status} />} />
            <Info label="Cycle period" value={windowLabel(viewing.start_date, viewing.end_date)} />
            <Info label="Review window" value={windowLabel(viewing.review_start_date, viewing.review_end_date)} />
            <Info label="Forms" value={String(viewing.forms_count ?? 0)} />
            <Info label="Reviews" value={String(viewing.reviews_count ?? 0)} />
          </dl>
        </PerfModal>
      )}
      {deleting && (
        <PerfModal
          title="Delete cycle?"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button type="button" className={btn.secondary} onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={btn.danger}
                disabled={del.isPending}
                onClick={async () => {
                  try {
                    await del.mutateAsync(deleting.cycle_id);
                    setDeleting(null);
                  } catch (e) {
                    setDelError(perfErrMessage(e));
                  }
                }}
              >
                Delete
              </button>
            </>
          }
        >
          <p className="text-xs text-slate-600">
            {deleting.cycle_name} and its forms will be deleted. This cannot be undone.
          </p>
          {delError && <Banner tone="error">{delError}</Banner>}
        </PerfModal>
      )}
    </div>
  );
};

const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <dt className="text-[11px] text-slate-500">{label}</dt>
    <dd className="font-semibold text-slate-800 mt-0.5">{value}</dd>
  </div>
);

/** Screen 2: Admin picks the type and the period; the system fills the dates, window, name and status. */
const CycleModal: React.FC<{ cycle: PerfCycleItem | null; onClose: () => void }> = ({ cycle, onClose }) => {
  const now = new Date();
  const [type, setType] = useState<CycleType>(cycle?.cycle_type || 'QUARTERLY');
  const [year, setYear] = useState<number>(cycle?.year || now.getFullYear());
  const [quarter, setQuarter] = useState<number | ''>(cycle?.quarter || '');
  const [month, setMonth] = useState<number | ''>(cycle?.month || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const create = useCreatePerfCycleMutation();
  const update = useUpdatePerfCycleMutation();
  const periodReady = type === 'YEARLY' || (type === 'QUARTERLY' ? Boolean(quarter) : Boolean(month));
  const { data: preview } = useCyclePreviewQuery(
    { cycle_type: type, year, quarter: type === 'QUARTERLY' ? Number(quarter) || undefined : undefined, month: type === 'MONTHLY' ? Number(month) || undefined : undefined },
    periodReady,
  );

  const save = async () => {
    const e: Record<string, string> = {};
    if (!year) e.year = 'Please select the Year.';
    if (type === 'QUARTERLY' && !quarter) e.quarter = 'Please select the Quarter.';
    if (type === 'MONTHLY' && !month) e.month = 'Please select the Month.';
    setErrors(e);
    setError('');
    if (Object.keys(e).length) return;
    const payload = {
      cycle_type: type,
      year,
      ...(type === 'QUARTERLY' ? { quarter: Number(quarter) } : {}),
      ...(type === 'MONTHLY' ? { month: Number(month) } : {}),
    };
    try {
      if (cycle) await update.mutateAsync({ cycleId: cycle.cycle_id, payload });
      else await create.mutateAsync(payload);
      onClose();
    } catch (err) {
      const fe = perfFieldErrors(err);
      setErrors(fe);
      if (!Object.keys(fe).length || fe.cycle_type) setError(perfErrMessage(err));
    }
  };

  const yearSelect = (
    <div>
      <label className={LABEL}>Year *</label>
      <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputCls}>
        {yearOptions().map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <ErrorNote text={errors.year} />
    </div>
  );

  return (
    <PerfModal
      title={cycle ? 'Edit Cycle' : 'Add Cycle'}
      wide
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btn.primary} disabled={create.isPending || update.isPending} onClick={save}>
            Save Cycle
          </button>
        </>
      }
    >
      <p className="text-xs text-slate-500 mb-4">Choose the type and the period. The system fills the dates.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="text-xs font-bold text-slate-900">Cycle details</div>
          <div>
            <label className={LABEL}>Cycle Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`py-2 rounded-xl border text-xs font-semibold ${type === t.value ? 'bg-teal-700 border-teal-700 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <ErrorNote text={errors.cycle_type} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {type !== 'MONTHLY' && yearSelect}
            {type === 'QUARTERLY' && (
              <div>
                <label className={LABEL}>Quarter *</label>
                <select value={quarter} onChange={(e) => setQuarter(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                  <option value="">Select</option>
                  {QUARTERS.map((q, i) => (
                    <option key={q} value={i + 1}>
                      {q}
                    </option>
                  ))}
                </select>
                <ErrorNote text={errors.quarter} />
              </div>
            )}
            {type === 'MONTHLY' && (
              <>
                <div>
                  <label className={LABEL}>Month *</label>
                  <select value={month} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                    <option value="">Select</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ErrorNote text={errors.month} />
                </div>
                {yearSelect}
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Quarter choices: Jan to Mar, Apr to Jun, Jul to Sep, Oct to Dec. Yearly shows only Year. Monthly shows Month and Year.
          </p>
          {error && <Banner tone="error">{error}</Banner>}
        </div>
        <div className="rounded-xl border border-slate-200 p-4 space-y-3 text-xs bg-slate-50/50">
          <div className="font-bold text-slate-900">Filled by the system</div>
          <Info label="Cycle name" value={preview?.cycle_name || '—'} />
          <Info label="Cycle period" value={preview ? windowLabel(preview.start_date, preview.end_date) : '—'} />
          <Info label="Review window" value={preview ? windowLabel(preview.review_start_date, preview.review_end_date) : '—'} />
          <Info label="Status" value={preview ? <CycleStatusBadge status={preview.status} /> : '—'} />
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-900">
            <div className="font-bold">Review is compulsory</div>
            Everyone must finish within the window.
          </div>
        </div>
      </div>
    </PerfModal>
  );
};

// =============================================================================
// Question Master (Screens 3 and 4)
// =============================================================================

const QuestionMaster: React.FC = () => {
  const [draft, setDraft] = useState({ search: '', cycle_type: '', department_id: '', status: '' });
  const [filters, setFilters] = useState(draft);
  const { data: forms = [], isLoading } = usePerfFormsQuery({
    search: filters.search || undefined,
    cycle_type: filters.cycle_type || undefined,
    department_id: filters.department_id ? Number(filters.department_id) : undefined,
    status: filters.status || undefined,
  });
  const { data: departments = [] } = useDepartmentOptionsQuery();
  const publish = usePublishPerfFormMutation();
  const del = useDeletePerfFormMutation();
  const [editing, setEditing] = useState<PerfFormItem | 'new' | null>(null);
  const [viewing, setViewing] = useState<PerfFormItem | null>(null);
  const [deleting, setDeleting] = useState<PerfFormItem | null>(null);
  const [rowError, setRowError] = useState('');

  const togglePublish = async (f: PerfFormItem) => {
    setRowError('');
    try {
      await publish.mutateAsync({ formId: f.form_id, publish: !f.is_published });
    } catch (e) {
      setRowError(perfErrMessage(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Question Master</h2>
          <p className="text-xs text-slate-500">Create review forms for each cycle and department.</p>
        </div>
        <button type="button" className={btn.primary} onClick={() => setEditing('new')}>
          <Plus className="w-3.5 h-3.5" /> Add Form
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className={LABEL}>Search form</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} placeholder="Form name" className={`${inputCls} pl-8`} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Cycle Type</label>
          <select value={draft.cycle_type} onChange={(e) => setDraft({ ...draft, cycle_type: e.target.value })} className={inputCls}>
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Department</label>
          <select value={draft.department_id} onChange={(e) => setDraft({ ...draft, department_id: e.target.value })} className={inputCls}>
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d.dep_id} value={d.dep_id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Status</label>
          <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={inputCls}>
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btn.primary} onClick={() => setFilters(draft)}>
            Apply
          </button>
          <button
            type="button"
            className={btn.secondary}
            onClick={() => {
              const empty = { search: '', cycle_type: '', department_id: '', status: '' };
              setDraft(empty);
              setFilters(empty);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {rowError && <Banner tone="error">{rowError}</Banner>}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs min-w-[760px]">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Form Name</th>
              <th className="text-left px-3 py-3">Cycle</th>
              <th className="text-left px-3 py-3">For</th>
              <th className="text-left px-3 py-3">Questions</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && forms.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No forms found.
                </td>
              </tr>
            )}
            {forms.map((f) => (
              <tr key={f.form_id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-semibold text-slate-800">{f.form_name}</td>
                <td className="px-3 py-3">{f.cycle?.cycle_name || '—'}</td>
                <td className="px-3 py-3">{f.for_label}</td>
                <td className="px-3 py-3">{f.questions_label}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      f.is_published ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {f.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <RowActionsMenu
                    actions={[
                      { label: 'View', icon: Eye, onClick: () => setViewing(f) },
                      ...(f.can_edit
                        ? [
                            { label: 'Edit', icon: Pencil, onClick: () => setEditing(f) },
                            f.is_published
                              ? { label: 'Move to Draft', icon: Undo2, onClick: () => togglePublish(f) }
                              : { label: 'Publish', icon: Send, onClick: () => togglePublish(f) },
                            ...(!f.reviews_count ? [{ label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleting(f) }] : []),
                          ]
                        : []),
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <FormBuilder form={editing === 'new' ? null : editing} departments={departments} onClose={() => setEditing(null)} />}
      {viewing && <FormView form={viewing} onClose={() => setViewing(null)} />}
      {deleting && (
        <PerfModal
          title="Delete form?"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button type="button" className={btn.secondary} onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={btn.danger}
                disabled={del.isPending}
                onClick={async () => {
                  try {
                    await del.mutateAsync(deleting.form_id);
                    setDeleting(null);
                  } catch (e) {
                    setRowError(perfErrMessage(e));
                    setDeleting(null);
                  }
                }}
              >
                Delete
              </button>
            </>
          }
        >
          <p className="text-xs text-slate-600">{deleting.form_name} will be deleted. This cannot be undone.</p>
        </PerfModal>
      )}
    </div>
  );
};

const FormView: React.FC<{ form: PerfFormItem; onClose: () => void }> = ({ form, onClose }) => (
  <PerfModal title={form.form_name} wide onClose={onClose}>
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Info label="Cycle" value={form.cycle?.cycle_name || '—'} />
        <Info label="Form is for" value={form.for_label} />
        <Info label="Questions" value={form.questions_label} />
        <Info label="Status" value={form.is_published ? 'Published' : 'Draft'} />
      </div>
      <ol className="list-decimal pl-5 space-y-1.5">
        {form.questions.map((q) => (
          <li key={q.id} className="text-slate-800">
            <span className="font-semibold">{q.title}</span>{' '}
            <span className="text-slate-500">
              — {ANSWER_TYPES.find((a) => a.value === q.type)?.label}
              {q.is_fixed ? ' (fixed)' : q.is_required ? ' (required)' : ''}
              {q.options?.length ? `: ${q.options.map((o) => o.label).join(', ')}` : ''}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-slate-500">Comment box (always included, optional to fill).</p>
    </div>
  </PerfModal>
);

type ExtraQ = PerfQuestionItem & { optionsText?: string[] };

/** Screen 4: Add Form — form details, locked fixed questions, extra questions and question settings. */
const FormBuilder: React.FC<{ form: PerfFormItem | null; departments: Array<{ dep_id: number; name: string }>; onClose: () => void }> = ({
  form,
  departments,
  onClose,
}) => {
  const { data: fixed = [] } = useFixedQuestionsQuery();
  const { data: allCycles = [] } = usePerfCyclesQuery();
  const [name, setName] = useState(form?.form_name || '');
  const [cycleType, setCycleType] = useState<CycleType | ''>((form?.cycle?.cycle_type as CycleType) || '');
  const [cycleId, setCycleId] = useState<number | ''>(form?.cycle_id || '');
  const [forAll, setForAll] = useState(form ? form.department_ids.length === 0 : true);
  const [deptIds, setDeptIds] = useState<number[]>(form?.department_ids || []);
  const [extras, setExtras] = useState<ExtraQ[]>(() =>
    (form?.questions || []).filter((q) => !q.is_fixed).map((q) => ({ ...q, optionsText: (q.options || []).map((o) => o.label) })),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const save = useSavePerfFormMutation();
  const publish = usePublishPerfFormMutation();
  const { data: noFormDeps = [] } = useFormCoverageQuery(cycleId ? Number(cycleId) : undefined);

  // Only cycles of the chosen type that have not opened yet can get a new or changed form.
  const cycles = useMemo(
    () => allCycles.filter((c) => (!cycleType || c.cycle_type === cycleType) && (c.status === 'UPCOMING' || c.cycle_id === form?.cycle_id)),
    [allCycles, cycleType, form?.cycle_id],
  );
  useEffect(() => {
    if (cycleId && !cycles.some((c) => c.cycle_id === cycleId)) setCycleId('');
  }, [cycles, cycleId]);

  // Departments that would still have no form after this one.
  const stillMissing = useMemo(() => {
    if (forAll) return [];
    const own = new Set(form?.department_ids || []);
    return noFormDeps.filter((d) => !deptIds.includes(d.dep_id) && !own.has(d.dep_id));
  }, [noFormDeps, deptIds, forAll, form?.department_ids]);

  const sel = extras.find((q) => q.id === selected) || null;
  const patch = (id: string, p: Partial<ExtraQ>) => setExtras((list) => list.map((q) => (q.id === id ? { ...q, ...p } : q)));
  const addQuestion = () => {
    const id = `q_${Date.now().toString(36)}`;
    setExtras((l) => [...l, { id, title: '', type: 'SHORT_ANSWER', is_fixed: false, is_required: false, optionsText: [] }]);
    setSelected(id);
  };

  const payload = () => ({
    form_name: name.trim(),
    cycle_id: Number(cycleId),
    department_ids: forAll ? [] : deptIds,
    questions: extras.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      type: q.type,
      is_fixed: false,
      is_required: q.type === 'STAR_RATING' ? true : q.is_required,
      options: (q.optionsText || []).filter((o) => o.trim()).map((o) => ({ value: o.trim(), label: o.trim() })),
    })),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.form_name = 'Please enter the Form name.';
    if (!cycleType) e.cycle_type = 'Please select the Cycle type.';
    if (!cycleId) e.cycle_id = 'Please select the Cycle.';
    if (!forAll && deptIds.length === 0) e.department_ids = 'Please select at least one department.';
    if (extras.some((q) => !q.title.trim())) e.questions = 'Please write the question for every extra question.';
    const badChoice = extras.find((q) => (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && (q.optionsText || []).filter((o) => o.trim()).length < 2);
    if (badChoice) e.questions = `Please add at least 2 options for "${badChoice.title || 'the question'}".`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (andPublish: boolean) => {
    setError('');
    if (!validate()) return;
    try {
      const saved = await save.mutateAsync({ formId: form?.form_id, payload: payload() as any });
      if (andPublish && !saved.is_published) await publish.mutateAsync({ formId: saved.form_id, publish: true });
      onClose();
    } catch (err) {
      const fe = perfFieldErrors(err);
      setErrors(fe);
      setError(perfErrMessage(err));
    }
  };

  return (
    <PerfModal
      title={form ? 'Edit Form' : 'Add Form'}
      wide
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btn.secondary} disabled={save.isPending} onClick={() => submit(false)}>
            Save Draft
          </button>
          <button type="button" className={btn.primary} disabled={save.isPending || publish.isPending} onClick={() => submit(true)}>
            Publish
          </button>
        </>
      }
    >
      <p className="text-xs text-slate-500 mb-4">Build the review form. The 5 rating questions and the comment box are always included.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="text-xs font-bold text-slate-900">Form details</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={LABEL}>Form name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={150} className={inputCls} placeholder="e.g. Monthly Review – Oct 2026" />
                <ErrorNote text={errors.form_name} />
              </div>
              <div>
                <label className={LABEL}>Cycle type *</label>
                <select value={cycleType} onChange={(e) => setCycleType(e.target.value as CycleType)} className={inputCls}>
                  <option value="">Select</option>
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ErrorNote text={errors.cycle_type} />
              </div>
              <div>
                <label className={LABEL}>Cycle *</label>
                <select value={cycleId} onChange={(e) => setCycleId(e.target.value ? Number(e.target.value) : '')} className={inputCls} disabled={!cycleType}>
                  <option value="">{cycleType ? 'Select' : 'Select cycle type first'}</option>
                  {cycles.map((c) => (
                    <option key={c.cycle_id} value={c.cycle_id}>
                      {c.cycle_name}
                    </option>
                  ))}
                </select>
                <ErrorNote text={errors.cycle_id} />
              </div>
            </div>
            <div>
              <label className={LABEL}>Form is for *</label>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
                <label className="inline-flex items-center gap-1.5">
                  <input type="radio" checked={forAll} onChange={() => setForAll(true)} /> All departments
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input type="radio" checked={!forAll} onChange={() => setForAll(false)} /> Selected departments
                </label>
              </div>
              {!forAll && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {departments.map((d) => {
                    const on = deptIds.includes(d.dep_id);
                    return (
                      <button
                        key={d.dep_id}
                        type="button"
                        onClick={() => setDeptIds((l) => (on ? l.filter((x) => x !== d.dep_id) : [...l, d.dep_id]))}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${on ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {d.name} {on && <X className="w-3 h-3 inline" />}
                      </button>
                    );
                  })}
                </div>
              )}
              <ErrorNote text={errors.department_ids} />
              {stillMissing.length > 0 && (
                <p className="text-[11px] text-amber-700 mt-1">
                  No form is available for these departments: {stillMissing.map((d) => d.name).join(', ')}. Add a form or choose All departments.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-900">Fixed rating questions (cannot be changed)</div>
              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked • Compulsory
              </span>
            </div>
            {fixed.map((q, i) => (
              <div key={q.id} className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-700">
                  {i + 1}. {q.title}
                </span>
                <StarRating value={5} readonly size={13} />
              </div>
            ))}
            <p className="text-[11px] italic text-slate-500">Comment box (always included, optional to fill)</p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="text-xs font-bold text-slate-900">Extra questions (optional)</div>
            {extras.length === 0 && <p className="text-[11px] text-slate-500">No extra questions.</p>}
            {extras.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelected(q.id)}
                className={`w-full text-left p-3 rounded-xl border ${selected === q.id ? 'border-teal-500 bg-teal-50/40' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <div className="text-xs font-semibold text-slate-800">
                  Q{i + 1}. {q.title || <span className="text-slate-400">Untitled question</span>}
                </div>
                <div className="text-[11px] text-slate-500">
                  {ANSWER_TYPES.find((a) => a.value === q.type)?.label}
                  {q.type === 'SHORT_ANSWER' ? ' (no options)' : ''}
                  {q.type === 'STAR_RATING' ? ' (compulsory)' : q.is_required ? ' (required)' : ''}
                  {(q.optionsText || []).filter(Boolean).length ? ` — ${(q.optionsText || []).filter(Boolean).join(' / ')}` : ''}
                </div>
              </button>
            ))}
            <button type="button" onClick={addQuestion} className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add question
            </button>
            <ErrorNote text={errors.questions} />
          </div>
          {error && <Banner tone="error">{error}</Banner>}
        </div>

        <div className="rounded-xl border border-slate-200 p-4 space-y-3 text-xs h-fit">
          <div className="font-bold text-slate-900">Question settings</div>
          {!sel ? (
            <p className="text-[11px] text-slate-500">Select an extra question to change it.</p>
          ) : (
            <>
              <div className="text-[11px] text-slate-500">Selected: Q{extras.indexOf(sel) + 1}</div>
              <div>
                <label className={LABEL}>Question *</label>
                <input value={sel.title} onChange={(e) => patch(sel.id, { title: e.target.value })} maxLength={300} className={inputCls} />
              </div>
              <div>
                <label className={LABEL}>Answer type</label>
                <select
                  value={sel.type}
                  onChange={(e) => {
                    const t = e.target.value as QuestionType;
                    patch(sel.id, { type: t, is_required: t === 'STAR_RATING' ? true : sel.is_required, optionsText: t === 'SINGLE_CHOICE' || t === 'MULTIPLE_CHOICE' ? sel.optionsText || [] : [] });
                  }}
                  className={inputCls}
                >
                  {ANSWER_TYPES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Short answer has no options. Star rating questions are always compulsory.</p>
              </div>
              {(sel.type === 'SINGLE_CHOICE' || sel.type === 'MULTIPLE_CHOICE') && (
                <div className="space-y-1.5">
                  <label className={LABEL}>Options</label>
                  {(sel.optionsText || []).map((o, idx) => (
                    <div key={idx} className="flex gap-1.5">
                      <input
                        value={o}
                        maxLength={100}
                        onChange={(e) => patch(sel.id, { optionsText: (sel.optionsText || []).map((x, j) => (j === idx ? e.target.value : x)) })}
                        className={inputCls}
                      />
                      <button
                        type="button"
                        aria-label="Remove option"
                        onClick={() => patch(sel.id, { optionsText: (sel.optionsText || []).filter((_, j) => j !== idx) })}
                        className="px-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => patch(sel.id, { optionsText: [...(sel.optionsText || []), ''] })} className="text-[11px] font-semibold text-blue-600 hover:underline">
                    + Add option
                  </button>
                </div>
              )}
              <label className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Answer is required</span>
                <input
                  type="checkbox"
                  checked={sel.type === 'STAR_RATING' ? true : sel.is_required}
                  disabled={sel.type === 'STAR_RATING'}
                  onChange={(e) => patch(sel.id, { is_required: e.target.checked })}
                />
              </label>
              <div className="flex flex-col items-start gap-1.5 pt-1">
                <button
                  type="button"
                  className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                  onClick={() => {
                    const id = `q_${Date.now().toString(36)}`;
                    setExtras((l) => {
                      const i = l.findIndex((x) => x.id === sel.id);
                      const copy = { ...sel, id, optionsText: [...(sel.optionsText || [])] };
                      return [...l.slice(0, i + 1), copy, ...l.slice(i + 1)];
                    });
                    setSelected(id);
                  }}
                >
                  <Copy className="w-3 h-3" /> Duplicate question
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-red-600 hover:underline inline-flex items-center gap-1"
                  onClick={() => {
                    setExtras((l) => l.filter((x) => x.id !== sel.id));
                    setSelected(null);
                  }}
                >
                  <Trash2 className="w-3 h-3" /> Delete question
                </button>
              </div>
            </>
          )}
          {cycleId && (
            <p className="text-[10px] text-slate-400 pt-2">
              This form locks on {fmtDate(allCycles.find((c) => c.cycle_id === cycleId)?.review_start_date)}, when the review window opens.
            </p>
          )}
        </div>
      </div>
    </PerfModal>
  );
};
