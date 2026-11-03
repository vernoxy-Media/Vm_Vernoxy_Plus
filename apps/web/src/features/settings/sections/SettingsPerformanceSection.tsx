import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Award,
  ClipboardCheck,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Info,
  ChevronDown,
  Building2,
} from 'lucide-react';
import {
  usePerfCyclesQuery,
  useCreatePerfCycleMutation,
  useUpdatePerfCycleMutation,
  useDeletePerfCycleMutation,
  usePerfFormsQuery,
  useCreatePerfFormMutation,
  useUpdatePerfFormMutation,
  useDeletePerfFormMutation,
  usePublishPerfFormMutation,
  PerfCycleItem,
  PerfFormItem,
  PerfQuestionItem,
} from '@/features/performance/hooks/use-performance';
import { useDepartmentOptionsQuery } from '@/features/organization/hooks/use-organization';

const FIXED_QUESTIONS: PerfQuestionItem[] = [
  { id: 'q_comm', title: 'Communication', description: 'Evaluates clarity, responsiveness, and stakeholder interaction', type: 'STAR_RATING', is_fixed: true, required: true },
  { id: 'q_behav', title: 'Behaviour', description: 'Evaluates professionalism, attitude, and work ethics', type: 'STAR_RATING', is_fixed: true, required: true },
  { id: 'q_regul', title: 'Regularity', description: 'Evaluates punctuality, attendance, and adherence to company hours', type: 'STAR_RATING', is_fixed: true, required: true },
  { id: 'q_teamw', title: 'Teamwork', description: 'Evaluates collaboration, peer support, and team contribution', type: 'STAR_RATING', is_fixed: true, required: true },
  { id: 'q_qualw', title: 'Quality of Work', description: 'Evaluates accuracy, diligence, and work output quality', type: 'STAR_RATING', is_fixed: true, required: true },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const SettingsPerformanceSection: React.FC = () => {
  const location = useLocation();

  // Active sub-tab determined by route path
  const isFormsTab = location.pathname.includes('performance-forms');
  const activeTab: 'CYCLES' | 'FORMS' = isFormsTab ? 'FORMS' : 'CYCLES';

  // -------------------------------------------------------------
  // Data Queries
  // -------------------------------------------------------------
  const { data: cycles = [], isLoading: cyclesLoading } = usePerfCyclesQuery();
  const { data: forms = [], isLoading: formsLoading } = usePerfFormsQuery();
  const { data: departments = [] } = useDepartmentOptionsQuery();

  // Mutations
  const createCycleMut = useCreatePerfCycleMutation();
  const updateCycleMut = useUpdatePerfCycleMutation();
  const deleteCycleMut = useDeletePerfCycleMutation();

  const createFormMut = useCreatePerfFormMutation();
  const updateFormMut = useUpdatePerfFormMutation();
  const deleteFormMut = useDeletePerfFormMutation();
  const publishFormMut = usePublishPerfFormMutation();

  // -------------------------------------------------------------
  // Shared & Filter State
  // -------------------------------------------------------------
  const [search, setSearch] = useState('');
  const [cycleTypeFilter, setCycleTypeFilter] = useState('');
  const [cycleStatusFilter, setCycleStatusFilter] = useState('');

  // -------------------------------------------------------------
  // Cycle Modal State
  // -------------------------------------------------------------
  const [cycleModalOpen, setCycleModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<PerfCycleItem | null>(null);
  const [cycleNameInput, setCycleNameInput] = useState('');
  const [cycleType, setCycleType] = useState<'YEARLY' | 'QUARTERLY' | 'MONTHLY'>('QUARTERLY');
  const [cycleYear, setCycleYear] = useState<number>(new Date().getFullYear());
  const [cycleQuarter, setCycleQuarter] = useState<number>(1);
  const [cycleMonth, setCycleMonth] = useState<number>(1);
  const [cycleStatus, setCycleStatus] = useState<'UPCOMING' | 'REVIEW_OPEN' | 'CLOSED'>('UPCOMING');
  const [cycleReviewStart, setCycleReviewStart] = useState('');
  const [cycleReviewEnd, setCycleReviewEnd] = useState('');
  const [cycleError, setCycleError] = useState('');

  // -------------------------------------------------------------
  // Form Builder Modal State
  // -------------------------------------------------------------
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<PerfFormItem | null>(null);
  const [formCycleId, setFormCycleId] = useState<number | undefined>(undefined);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDeptIds, setFormDeptIds] = useState<number[]>([]);
  const [formQuestions, setFormQuestions] = useState<PerfQuestionItem[]>(FIXED_QUESTIONS);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(FIXED_QUESTIONS.map((q) => q.id));
  const [formIsPublished, setFormIsPublished] = useState(false);
  const [formError, setFormError] = useState('');

  // Target Department Dropdown State
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const [deptSearchQuery, setDeptSearchQuery] = useState('');

  // Extra question draft inside Form Builder
  const [newQTitle, setNewQTitle] = useState('');
  const [newQDesc, setNewQDesc] = useState('');
  const [newQType, setNewQType] = useState<'STAR_RATING' | 'SHORT_ANSWER' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE'>('STAR_RATING');
  const [newQRequired, setNewQRequired] = useState(true);
  const [newQOptions, setNewQOptions] = useState<string>('');

  // -------------------------------------------------------------
  // Delete Confirmation Modal State
  // -------------------------------------------------------------
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'CYCLE' | 'FORM'; id: number; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Helper for auto-calculating cycle dates and default names
  const computeCyclePreview = (type: 'YEARLY' | 'QUARTERLY' | 'MONTHLY', y: number, q?: number, m?: number) => {
    let defName = '';
    let periodStr = '';
    let windowStr = '';
    let defReviewStart = '';
    let defReviewEnd = '';

    if (type === 'YEARLY') {
      defName = `${y} Yearly Review`;
      periodStr = `01 Jan ${y} – 31 Dec ${y}`;
      windowStr = `01 Jan ${y + 1} – 10 Jan ${y + 1}`;
      defReviewStart = `${y + 1}-01-01`;
      defReviewEnd = `${y + 1}-01-10`;
    } else if (type === 'QUARTERLY') {
      const qVal = q || 1;
      const quarters = [
        { label: 'Q1 (Jan – Mar)', start: `01 Jan ${y}`, end: `31 Mar ${y}`, wStart: `01 Apr ${y}`, wEnd: `10 Apr ${y}`, ds: `${y}-04-01`, de: `${y}-04-10` },
        { label: 'Q2 (Apr – Jun)', start: `01 Apr ${y}`, end: `30 Jun ${y}`, wStart: `01 Jul ${y}`, wEnd: `10 Jul ${y}`, ds: `${y}-07-01`, de: `${y}-07-10` },
        { label: 'Q3 (Jul – Sep)', start: `01 Jul ${y}`, end: `30 Sep ${y}`, wStart: `01 Oct ${y}`, wEnd: `10 Oct ${y}`, ds: `${y}-10-01`, de: `${y}-10-10` },
        { label: 'Q4 (Oct – Dec)', start: `01 Oct ${y}`, end: `31 Dec ${y}`, wStart: `01 Jan ${y + 1}`, wEnd: `10 Jan ${y + 1}`, ds: `${y + 1}-01-01`, de: `${y + 1}-01-10` },
      ];
      const curQ = quarters[qVal - 1];
      defName = `${y} ${curQ.label} Review`;
      periodStr = `${curQ.start} – ${curQ.end}`;
      windowStr = `${curQ.wStart} – ${curQ.wEnd}`;
      defReviewStart = curQ.ds;
      defReviewEnd = curQ.de;
    } else if (type === 'MONTHLY') {
      const mVal = m || 1;
      const mName = MONTH_NAMES[mVal - 1];
      defName = `${mName} ${y} Review`;
      const lastDay = new Date(Date.UTC(y, mVal, 0)).getUTCDate();
      periodStr = `01 ${mName.slice(0, 3)} ${y} – ${lastDay} ${mName.slice(0, 3)} ${y}`;

      const nextM = mVal === 12 ? 1 : mVal + 1;
      const nextY = mVal === 12 ? y + 1 : y;
      const nextMName = MONTH_NAMES[nextM - 1].slice(0, 3);
      windowStr = `01 ${nextMName} ${nextY} – 10 ${nextMName} ${nextY}`;
      defReviewStart = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
      defReviewEnd = `${nextY}-${String(nextM).padStart(2, '0')}-10`;
    }

    return { defName, periodStr, windowStr, defReviewStart, defReviewEnd };
  };

  const preview = computeCyclePreview(cycleType, cycleYear, cycleQuarter, cycleMonth);

  // -------------------------------------------------------------
  // Cycle Helpers
  // -------------------------------------------------------------
  const openAddCycleModal = () => {
    setEditingCycle(null);
    setCycleType('QUARTERLY');
    setCycleYear(new Date().getFullYear());
    setCycleQuarter(1);
    setCycleMonth(1);
    const p = computeCyclePreview('QUARTERLY', new Date().getFullYear(), 1, 1);
    setCycleNameInput(p.defName);
    setCycleReviewStart(p.defReviewStart);
    setCycleReviewEnd(p.defReviewEnd);
    setCycleStatus('UPCOMING');
    setCycleError('');
    setCycleModalOpen(true);
  };

  const openEditCycleModal = (c: PerfCycleItem) => {
    setEditingCycle(c);
    setCycleNameInput(c.cycle_name || c.name || '');
    setCycleType(c.cycle_type);
    setCycleYear(c.year);
    setCycleQuarter(c.quarter || 1);
    setCycleMonth(c.month || 1);
    setCycleStatus(c.status);
    setCycleReviewStart(c.review_start_date ? c.review_start_date.slice(0, 10) : '');
    setCycleReviewEnd(c.review_end_date ? c.review_end_date.slice(0, 10) : '');
    setCycleError('');
    setCycleModalOpen(true);
  };

  const handleSaveCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setCycleError('');

    if (!cycleReviewStart || !cycleReviewEnd) {
      setCycleError('Please specify both Review Window start and end dates.');
      return;
    }
    if (cycleReviewStart > cycleReviewEnd) {
      setCycleError('Review Window start date cannot be after end date.');
      return;
    }

    try {
      if (editingCycle) {
        await updateCycleMut.mutateAsync({
          cycleId: editingCycle.cycle_id,
          payload: {
            cycle_name: cycleNameInput.trim() || undefined,
            review_start_date: cycleReviewStart,
            review_end_date: cycleReviewEnd,
            status: cycleStatus,
          },
        });
      } else {
        await createCycleMut.mutateAsync({
          cycle_name: cycleNameInput.trim() || preview.defName,
          cycle_type: cycleType,
          year: Number(cycleYear),
          quarter: cycleType === 'QUARTERLY' ? Number(cycleQuarter) : undefined,
          month: cycleType === 'MONTHLY' ? Number(cycleMonth) : undefined,
          review_start_date: cycleReviewStart,
          review_end_date: cycleReviewEnd,
        });
      }
      setCycleModalOpen(false);
    } catch (err: any) {
      setCycleError(err?.message || 'Failed to save cycle. Ensure no duplicate cycle exists for this period.');
    }
  };

  // -------------------------------------------------------------
  // Form Helpers
  // -------------------------------------------------------------
  const openAddFormModal = () => {
    setEditingForm(null);
    setFormCycleId(cycles[0]?.cycle_id);
    setFormName('');
    setFormDesc('');
    setFormDeptIds([]); // Empty = All Departments
    setFormQuestions(FIXED_QUESTIONS);
    setSelectedQuestionIds(FIXED_QUESTIONS.map((q) => q.id)); // By default, all selected
    setFormIsPublished(false);
    setFormError('');
    setDeptDropdownOpen(false);
    setDeptSearchQuery('');
    resetNewQFields();
    setFormModalOpen(true);
  };

  const openEditFormModal = (f: PerfFormItem) => {
    setEditingForm(f);
    setFormCycleId(f.cycle_id);
    setFormName(f.form_name);
    setFormDesc(f.description || '');
    setFormDeptIds(f.department_ids || []);

    const savedQuestions = f.questions || [];
    const savedIds = new Set(savedQuestions.map((q) => q.id));
    const allList = [...savedQuestions];
    for (const fq of FIXED_QUESTIONS) {
      if (!savedIds.has(fq.id)) {
        allList.push(fq);
      }
    }

    setFormQuestions(allList.length ? allList : FIXED_QUESTIONS);
    setSelectedQuestionIds(
      savedQuestions.length
        ? savedQuestions.map((q) => q.id)
        : FIXED_QUESTIONS.map((q) => q.id)
    );
    setFormIsPublished(f.is_published);
    setFormError('');
    setDeptDropdownOpen(false);
    setDeptSearchQuery('');
    resetNewQFields();
    setFormModalOpen(true);
  };

  const resetNewQFields = () => {
    setNewQTitle('');
    setNewQDesc('');
    setNewQType('STAR_RATING');
    setNewQRequired(true);
    setNewQOptions('');
  };

  const handleAddExtraQuestion = () => {
    if (!newQTitle.trim()) return;
    const newId = `extra_${Date.now()}`;
    const opts = (newQType === 'SINGLE_CHOICE' || newQType === 'MULTIPLE_CHOICE')
      ? newQOptions.split(',').map((o) => o.trim()).filter(Boolean).map((v) => ({ value: v, label: v }))
      : undefined;

    const newQuestion: PerfQuestionItem = {
      id: newId,
      title: newQTitle.trim(),
      description: newQDesc.trim() || undefined,
      type: newQType,
      is_fixed: false,
      required: newQRequired,
      options: opts,
    };

    setFormQuestions((prev) => [...prev, newQuestion]);
    setSelectedQuestionIds((prev) => [...prev, newId]); // Added custom questions are selected by default
    resetNewQFields();
  };

  const handleRemoveQuestion = (id: string) => {
    setFormQuestions((prev) => prev.filter((q) => q.id !== id));
    setSelectedQuestionIds((prev) => prev.filter((qId) => qId !== id));
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  const handleSelectAllQuestions = () => {
    setSelectedQuestionIds(formQuestions.map((q) => q.id));
  };

  const handleDeselectAllQuestions = () => {
    setSelectedQuestionIds([]);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formCycleId) {
      setFormError('Please select a Performance Cycle.');
      return;
    }
    if (!formName.trim()) {
      setFormError('Please enter a Form Name.');
      return;
    }
    if (selectedQuestionIds.length === 0) {
      setFormError('Please select at least one evaluation question for this form.');
      return;
    }

    const selectedQuestions = formQuestions
      .filter((q) => selectedQuestionIds.includes(q.id))
      .map((q) => ({
        ...q,
        is_fixed: Boolean(q.is_fixed),
      }));

    try {
      if (editingForm) {
        await updateFormMut.mutateAsync({
          formId: editingForm.form_id,
          payload: {
            form_name: formName.trim(),
            description: formDesc.trim() || undefined,
            department_ids: formDeptIds,
            questions: selectedQuestions,
            is_published: formIsPublished,
          },
        });
      } else {
        await createFormMut.mutateAsync({
          cycle_id: formCycleId,
          form_name: formName.trim(),
          description: formDesc.trim() || undefined,
          department_ids: formDeptIds,
          questions: selectedQuestions,
          is_published: formIsPublished,
        });
      }
      setFormModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save form.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleteError('');
    try {
      if (itemToDelete.type === 'CYCLE') {
        await deleteCycleMut.mutateAsync(itemToDelete.id);
      } else {
        await deleteFormMut.mutateAsync(itemToDelete.id);
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete record.');
    }
  };

  // Filtered lists
  const filteredCycles = cycles.filter((c) => {
    const cName = c.cycle_name || c.name || '';
    if (cycleTypeFilter && c.cycle_type !== cycleTypeFilter) return false;
    if (cycleStatusFilter && c.status !== cycleStatusFilter) return false;
    if (search && !cName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredForms = forms.filter((f) => {
    if (search && !f.form_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(deptSearchQuery.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            {activeTab === 'FORMS' ? (
              <>
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
                <span>Performance Forms (Question Master)</span>
              </>
            ) : (
              <>
                <Award className="w-5 h-5 text-blue-600" />
                <span>Performance Cycles (Cycle Master)</span>
              </>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'FORMS'
              ? 'Configure review templates, 5 compulsory core parameters, custom extra questions, and department scopes.'
              : 'Configure evaluation periods (Yearly, Quarterly, Monthly) and auto-computed 1st–10th review windows.'}
          </p>
        </div>

        <div>
          {activeTab === 'CYCLES' ? (
            <button
              type="button"
              onClick={openAddCycleModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Performance Cycle</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openAddFormModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Performance Form</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab === 'CYCLES' ? 'cycles' : 'forms'}...`}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        {activeTab === 'CYCLES' && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <select
              value={cycleTypeFilter}
              onChange={(e) => setCycleTypeFilter(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="YEARLY">Yearly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="MONTHLY">Monthly</option>
            </select>

            <select
              value={cycleStatusFilter}
              onChange={(e) => setCycleStatusFilter(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="REVIEW_OPEN">Review Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: CYCLE MASTER */}
      {activeTab === 'CYCLES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Cycle Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Period Dates</th>
                  <th className="py-3 px-4">Review Window</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Forms</th>
                  <th className="py-3 px-4 text-center">Reviews</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cyclesLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">Loading cycles...</td>
                  </tr>
                ) : filteredCycles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">No performance cycles found.</td>
                  </tr>
                ) : (
                  filteredCycles.map((c) => {
                    const cName = c.cycle_name || c.name || `Cycle #${c.cycle_id}`;
                    const statusBadgeClass =
                      c.status === 'REVIEW_OPEN'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : c.status === 'UPCOMING'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <tr key={c.cycle_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{cName}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{c.cycle_type}</td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {c.start_date?.split('T')[0] ?? c.start_date} <span className="text-slate-400">&rarr;</span> {c.end_date?.split('T')[0] ?? c.end_date}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <span className="font-medium text-slate-800">{c.review_start_date?.split('T')[0] ?? c.review_start_date}</span>
                          <span className="text-slate-400"> to </span>
                          <span className="font-medium text-slate-800">{c.review_end_date?.split('T')[0] ?? c.review_end_date}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeClass}`}>
                            {c.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                          {c._count?.perf_forms ?? (c as any).forms_count ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                          {c._count?.perf_reviews ?? (c as any).reviews_count ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditCycleModal(c)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Cycle"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setItemToDelete({ type: 'CYCLE', id: c.cycle_id, name: cName });
                                setDeleteError('');
                                setDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Cycle"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: QUESTION MASTER / FORMS */}
      {activeTab === 'FORMS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Form Name</th>
                  <th className="py-3 px-4">Assigned Cycle</th>
                  <th className="py-3 px-4">Target Departments</th>
                  <th className="py-3 px-4 text-center">Questions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">Loading forms...</td>
                  </tr>
                ) : filteredForms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">No performance review forms found.</td>
                  </tr>
                ) : (
                  filteredForms.map((f) => {
                    const cName = f.perf_cycles?.cycle_name || f.perf_cycles?.name || `Cycle #${f.cycle_id}`;
                    const deptNames = f.department_ids?.length
                      ? departments
                        .filter((d) => f.department_ids.includes(d.dep_id))
                        .map((d) => d.name)
                        .join(', ')
                      : 'All Departments';

                    return (
                      <tr key={f.form_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{f.form_name}</div>
                          {f.description && (
                            <div className="text-[11px] text-slate-400 mt-0.5 max-w-sm truncate">
                              {f.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {cName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${f.department_ids?.length ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                            {deptNames}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {f.questions?.length ?? 5}
                          </span>
                          <span className="text-[10px] text-slate-400 block">questions</span>
                        </td>
                        <td className="py-3.5 px-4">
                          {f.is_published ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!f.is_published && (
                              <button
                                type="button"
                                onClick={() => publishFormMut.mutate(f.form_id)}
                                className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
                                title="Publish Form"
                              >
                                Publish
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditFormModal(f)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Form"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setItemToDelete({ type: 'FORM', id: f.form_id, name: f.form_name });
                                setDeleteError('');
                                setDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Form"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: ADD / EDIT CYCLE (Screen 2: Add Cycle)                       */}
      {/* ------------------------------------------------------------------ */}
      {cycleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingCycle ? 'Edit Performance Cycle' : 'Add Performance Cycle'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Pick cycle type and period; dates are computed automatically</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCycleModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCycle} className="p-5 space-y-4">
              {cycleError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{cycleError}</span>
                </div>
              )}

              {/* 1. Cycle Type (Yearly, Quarterly, Monthly) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cycle Type <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={Boolean(editingCycle)}
                  value={cycleType}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setCycleType(newType);
                    const p = computeCyclePreview(newType, cycleYear, cycleQuarter, cycleMonth);
                    setCycleNameInput(p.defName);
                    setCycleReviewStart(p.defReviewStart);
                    setCycleReviewEnd(p.defReviewEnd);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 font-medium"
                >
                  <option value="YEARLY">Yearly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              {/* 2. Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Year <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  disabled={Boolean(editingCycle)}
                  value={cycleYear}
                  onChange={(e) => {
                    const newY = Number(e.target.value);
                    setCycleYear(newY);
                    const p = computeCyclePreview(cycleType, newY, cycleQuarter, cycleMonth);
                    setCycleNameInput(p.defName);
                    setCycleReviewStart(p.defReviewStart);
                    setCycleReviewEnd(p.defReviewEnd);
                  }}
                  min={2020}
                  max={2035}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 font-medium"
                />
              </div>

              {/* 3. Quarter (if Quarterly) */}
              {cycleType === 'QUARTERLY' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quarter <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={Boolean(editingCycle)}
                    value={cycleQuarter}
                    onChange={(e) => {
                      const newQ = Number(e.target.value);
                      setCycleQuarter(newQ);
                      const p = computeCyclePreview(cycleType, cycleYear, newQ, cycleMonth);
                      setCycleNameInput(p.defName);
                      setCycleReviewStart(p.defReviewStart);
                      setCycleReviewEnd(p.defReviewEnd);
                    }}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 font-medium"
                  >
                    <option value={1}>Q1 (January – March)</option>
                    <option value={2}>Q2 (April – June)</option>
                    <option value={3}>Q3 (July – September)</option>
                    <option value={4}>Q4 (October – December)</option>
                  </select>
                </div>
              )}

              {/* 4. Month (if Monthly) */}
              {cycleType === 'MONTHLY' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Month <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={Boolean(editingCycle)}
                    value={cycleMonth}
                    onChange={(e) => {
                      const newM = Number(e.target.value);
                      setCycleMonth(newM);
                      const p = computeCyclePreview(cycleType, cycleYear, cycleQuarter, newM);
                      setCycleNameInput(p.defName);
                      setCycleReviewStart(p.defReviewStart);
                      setCycleReviewEnd(p.defReviewEnd);
                    }}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 font-medium"
                  >
                    {MONTH_NAMES.map((mName, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {mName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 5. Cycle Name (editable, pre-filled) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cycle Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={cycleNameInput}
                  onChange={(e) => setCycleNameInput(e.target.value)}
                  placeholder="e.g., October 2026 Review"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium"
                />
              </div>

              {/* 6. Period Reviewed (Reference) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Period Reviewed:</span>
                <span className="font-bold text-slate-800">{preview.periodStr}</span>
              </div>

              {/* 7. Review Window (Editable by Admin, defaults to 1st-10th) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Review Window <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCycleReviewStart(preview.defReviewStart);
                      setCycleReviewEnd(preview.defReviewEnd);
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Reset to Default (1st–10th)
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block mb-1">Window Opens</span>
                    <input
                      type="date"
                      value={cycleReviewStart}
                      onChange={(e) => setCycleReviewStart(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block mb-1">Window Closes</span>
                    <input
                      type="date"
                      value={cycleReviewEnd}
                      onChange={(e) => setCycleReviewEnd(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  By default set to the 1st–10th of following month. Admins can adjust the review period as needed.
                </p>
              </div>

              {/* 8. Cycle Status (editable if existing) */}
              {editingCycle && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cycle Status</label>
                  <select
                    value={cycleStatus}
                    onChange={(e) => setCycleStatus(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
                  >
                    <option value="UPCOMING">Upcoming</option>
                    <option value="REVIEW_OPEN">Review Open</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              )}

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  The Review Window defaults to the <strong>1st to 10th of the next month</strong> following the period end. Admins can update the window dates above to extend or adjust the review period.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCycleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCycleMut.isPending || updateCycleMut.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                >
                  {createCycleMut.isPending || updateCycleMut.isPending ? 'Saving...' : 'Save Cycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: FORM BUILDER (QUESTION MASTER)                              */}
      {/* ------------------------------------------------------------------ */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingForm ? 'Edit Performance Form' : 'Create Performance Form'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Configure questions, rating parameters, and department scopes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Performance Cycle Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Performance Cycle <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={Boolean(editingForm)}
                    value={formCycleId ?? ''}
                    onChange={(e) => setFormCycleId(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 disabled:bg-slate-50 font-medium"
                  >
                    <option value="">Select Cycle</option>
                    {cycles.map((c) => {
                      const cName = c.cycle_name || c.name || `Cycle #${c.cycle_id}`;
                      return (
                        <option key={c.cycle_id} value={c.cycle_id}>
                          {cName} — {c.cycle_type} ({c.status})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Form Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Form Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Engineering Review Q1 2026"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* 3. Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Optional guidance notes for employees and reviewers..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 resize-none"
                />
              </div>

              {/* 4. Target Departments Dropdown with "All" Select Option */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Target Departments
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {formDeptIds.length === 0 || formDeptIds.length === departments.length
                      ? 'Applied to All Departments'
                      : `${formDeptIds.length} of ${departments.length} selected`}
                  </span>
                </div>

                {/* Dropdown Trigger Button */}
                <button
                  type="button"
                  onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 flex items-center justify-between hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate font-medium">
                      {formDeptIds.length === 0 || formDeptIds.length === departments.length
                        ? 'All Departments (Entire Company)'
                        : `${formDeptIds.length} Department(s) Selected`}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${deptDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu Panel */}
                {deptDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden p-3 space-y-2.5 animate-in fade-in">
                    {/* Search inside departments */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={deptSearchQuery}
                        onChange={(e) => setDeptSearchQuery(e.target.value)}
                        placeholder="Search departments..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* All Option Checkbox */}
                    <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-blue-50/80 border border-blue-100">
                      <label className="flex items-center gap-2 text-xs font-bold text-blue-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formDeptIds.length === 0 || formDeptIds.length === departments.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormDeptIds(departments.map((d) => d.dep_id));
                            } else {
                              setFormDeptIds([]);
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-blue-300"
                        />
                        <span>All Departments (Select All)</span>
                      </label>

                      <div className="flex items-center gap-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFormDeptIds(departments.map((d) => d.dep_id))}
                          className="text-blue-600 hover:underline"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFormDeptIds([])}
                          className="text-slate-500 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Individual Department Checkbox Options */}
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {filteredDepartments.map((d) => {
                        const isChecked = formDeptIds.includes(d.dep_id);
                        return (
                          <label
                            key={d.dep_id}
                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                              isChecked ? 'bg-blue-50/50 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormDeptIds((prev) => [...prev, d.dep_id]);
                                } else {
                                  setFormDeptIds((prev) => prev.filter((id) => id !== d.dep_id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                            />
                            <span>{d.name}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {formDeptIds.length === 0 || formDeptIds.length === departments.length
                          ? 'Applied to all departments'
                          : `${formDeptIds.length} department(s) targeted`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeptDropdownOpen(false)}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-2xs"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {/* Selected Department Pills */}
                {formDeptIds.length > 0 && formDeptIds.length < departments.length && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {departments
                      .filter((d) => formDeptIds.includes(d.dep_id))
                      .map((d) => (
                        <span
                          key={d.dep_id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          <span>{d.name}</span>
                          <button
                            type="button"
                            onClick={() => setFormDeptIds((prev) => prev.filter((id) => id !== d.dep_id))}
                            className="text-blue-400 hover:text-rose-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Questions Section */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Evaluation Questions</h4>
                    <p className="text-[11px] text-slate-500">
                      Standard core parameters (selected by default) plus custom questions. Deselect any questions you do not wish to evaluate.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {selectedQuestionIds.length} of {formQuestions.length} Selected
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllQuestions}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllQuestions}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* List of questions */}
                <div className="space-y-2.5">
                  {formQuestions.map((q, idx) => {
                    const isSelected = selectedQuestionIds.includes(q.id);

                    return (
                      <div
                        key={q.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-white border-blue-200/90 shadow-2xs'
                            : 'bg-slate-50/70 border-slate-200 opacity-65'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleQuestionSelection(q.id)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                              />
                            </label>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold ${isSelected ? 'text-slate-900' : 'text-slate-500 line-through decoration-slate-400'}`}>
                                  {idx + 1}. {q.title}
                                </span>
                                {q.is_fixed ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                                    Core Parameter
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-md">
                                    Custom
                                  </span>
                                )}
                                {isSelected ? (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                    Selected
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded-full">
                                    Deselected
                                  </span>
                                )}
                              </div>

                              {q.description && (
                                <p className="text-[11px] text-slate-500 mt-1">{q.description}</p>
                              )}

                              <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-2">
                                <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm">
                                  {q.type}
                                </span>
                                <span>&bull;</span>
                                <span>{q.required ? 'Mandatory' : 'Optional'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                            <button
                              type="button"
                              onClick={() => toggleQuestionSelection(q.id)}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                                isSelected
                                  ? 'text-slate-600 border-slate-200 hover:bg-slate-100'
                                  : 'text-blue-600 border-blue-200 bg-blue-50/70 hover:bg-blue-100'
                              }`}
                            >
                              {isSelected ? 'Deselect' : 'Select'}
                            </button>

                            {!q.is_fixed && (
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Delete Custom Question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Extra Question Box */}
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Add Custom Question</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={newQTitle}
                        onChange={(e) => setNewQTitle(e.target.value)}
                        placeholder="Question title..."
                        className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <select
                        value={newQType}
                        onChange={(e) => setNewQType(e.target.value as any)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                      >
                        <option value="STAR_RATING">1–5 Star Rating</option>
                        <option value="SHORT_ANSWER">Text Answer</option>
                        <option value="SINGLE_CHOICE">Single Choice (Radio)</option>
                        <option value="MULTIPLE_CHOICE">Multiple Choice (Checkbox)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={newQDesc}
                      onChange={(e) => setNewQDesc(e.target.value)}
                      placeholder="Optional question description / instructions..."
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  {(newQType === 'SINGLE_CHOICE' || newQType === 'MULTIPLE_CHOICE') && (
                    <div>
                      <input
                        type="text"
                        value={newQOptions}
                        onChange={(e) => setNewQOptions(e.target.value)}
                        placeholder="Comma-separated options (e.g., Option 1, Option 2, Option 3)..."
                        className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newQRequired}
                        onChange={(e) => setNewQRequired(e.target.checked)}
                        className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Required response</span>
                    </label>

                    <button
                      type="button"
                      disabled={!newQTitle.trim()}
                      onClick={handleAddExtraQuestion}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                    >
                      + Add to Form
                    </button>
                  </div>
                </div>
              </div>

              {/* Publish Toggle */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Publish Form</div>
                  <div className="text-[11px] text-slate-400">
                    When published, form becomes ready for employees and managers during evaluation.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formIsPublished}
                  onChange={(e) => setFormIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 border-slate-300"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveForm}
                disabled={createFormMut.isPending || updateFormMut.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                {createFormMut.isPending || updateFormMut.isPending ? 'Saving...' : 'Save Form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* DELETE CONFIRMATION MODAL                                          */}
      {/* ------------------------------------------------------------------ */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Delete {itemToDelete.type === 'CYCLE' ? 'Cycle' : 'Form'}?
                </h4>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Are you sure you want to delete <strong>&quot;{itemToDelete.name}&quot;</strong>?
            </p>

            {deleteError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteCycleMut.isPending || deleteFormMut.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
              >
                {deleteCycleMut.isPending || deleteFormMut.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
