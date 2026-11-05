import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  X,
  Loader2,
  RotateCcw,
  Eye,
  FilterX,
  CalendarDays,
  Inbox,
} from 'lucide-react';
import {
  useMyComplaintsQuery,
  useCreateComplaintMutation,
  useWithdrawComplaintMutation,
  useConfirmResolutionMutation,
  useReopenComplaintMutation,
  useComplaintDetailsQuery,
  useAddRemarkMutation,
  useProjectsListQuery,
  ComplaintSummaryItem,
} from '../hooks/use-complaints';
import { useComplaintTypesQuery } from '../hooks/use-complaint-settings';
import {
  useDepartmentOptionsQuery,
} from '@/features/organization/hooks/use-organization';
import { useUploadAttachment } from '@/shared/hooks/use-attachments';
import { SearchableSelect } from '@/shared/ui/SearchableSelect';
import { Pagination } from '@/shared/ui/Pagination';
import { RowActionsMenu, type RowAction } from '@/shared/ui/RowActionsMenu';
import { Badge, Field, STATUS_TONE, StatCard } from '../components/complaint-ui';

export const MyComplaintsPage: React.FC = (): React.ReactElement => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>(undefined);

  // Queries
  const { data, isLoading } = useMyComplaintsQuery(selectedYear, selectedStatus, selectedTypeId);
  const { data: types = [] } = useComplaintTypesQuery(false);
  const { data: deptOptions = [] } = useDepartmentOptionsQuery();
  const { data: projectsData } = useProjectsListQuery();
  const projects = Array.isArray(projectsData) ? projectsData : ((projectsData as any)?.items || []);

  // Mutations
  const createMut = useCreateComplaintMutation();
  const withdrawMut = useWithdrawComplaintMutation();
  const confirmMut = useConfirmResolutionMutation();
  const reopenMut = useReopenComplaintMutation();
  const addRemarkMut = useAddRemarkMutation();
  const uploadAttachmentMut = useUploadAttachment();

  // Add Complaint Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [typeId, setTypeId] = useState<number | ''>('');
  const [complaintDate, setComplaintDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [relatedDeptId, setRelatedDeptId] = useState<number | ''>('');
  const [relatedProjectId, setRelatedProjectId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [initialRemarks, setInitialRemarks] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: number; name: string; size: number }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [addError, setAddError] = useState('');
  const [dateWarning, setDateWarning] = useState('');

  // Details Modal State
  const [viewingComplaintId, setViewingComplaintId] = useState<number | null>(null);
  const { data: complaintDetail, isLoading: isLoadingDetail, isError: isErrorDetail, error: detailError } = useComplaintDetailsQuery(viewingComplaintId);
  const [newRemarkText, setNewRemarkText] = useState('');

  // Action Modals State
  const [reopeningId, setReopeningId] = useState<number | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenError, setReopenError] = useState('');

  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmComment, setConfirmComment] = useState('');

  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');

  // Selected Type Hint
  const selectedTypeObj = types.find((t) => t.type_id === Number(typeId));

  const handleTypeChange = (newTypeId: number) => {
    setTypeId(newTypeId);
    const found = types.find((t) => t.type_id === newTypeId);
    if (found) {
      if (found.default_department_id) {
        setRelatedDeptId(found.default_department_id);
      }
      if (found.is_always_confidential) {
        setIsConfidential(true);
      }
    }
  };

  const handleDateChange = (dateVal: string) => {
    setComplaintDate(dateVal);
    setDateWarning('');
    if (dateVal) {
      const diffDays = Math.round(
        (Date.now() - new Date(dateVal).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays > 90) {
        setDateWarning('This issue happened more than 90 days ago. You can still submit it.');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedFiles.length + files.length > 5) {
      alert('You can upload up to 5 files per complaint.');
      return;
    }

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 5 MB limit.`);
        continue;
      }
      try {
        const res = await uploadAttachmentMut.mutateAsync({
          file,
          entityType: 'COMPLAINT',
          entityId: 0,
        });
        setUploadedFiles((prev) => [
          ...prev,
          { id: res.attachment_id, name: res.file_name, size: Number(res.file_size_bytes) },
        ]);
      } catch (err: any) {
        alert(`Failed to upload ${file.name}`);
      }
    }
    setIsUploading(false);
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!typeId || !relatedDeptId) {
      setAddError('Please fill all required fields.');
      return;
    }

    try {
      await createMut.mutateAsync({
        subject: subject.trim(),
        complaint_type_id: Number(typeId),
        complaint_date: complaintDate,
        related_department_id: Number(relatedDeptId),
        related_project_id: relatedProjectId ? Number(relatedProjectId) : undefined,
        description: description.trim(),
        remarks: initialRemarks.trim() || undefined,
        is_confidential: isConfidential,
        attachment_ids: uploadedFiles.map((f) => f.id),
      });

      setIsAddModalOpen(false);
      // Reset form
      setSubject('');
      setTypeId('');
      setDescription('');
      setInitialRemarks('');
      setUploadedFiles([]);
    } catch (err: any) {
      setAddError(err.detail || err.message || 'Failed to submit complaint.');
    }
  };

  const handleSendRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingComplaintId || !newRemarkText.trim()) return;

    try {
      await addRemarkMut.mutateAsync({
        id: viewingComplaintId,
        data: { remark_text: newRemarkText.trim(), is_internal: false },
      });
      setNewRemarkText('');
    } catch (err: any) {
      alert(err.detail || err.message || 'Failed to add remark.');
    }
  };

  const handleConfirmSubmit = async () => {
    if (!confirmingId) return;
    try {
      await confirmMut.mutateAsync({ id: confirmingId, comment: confirmComment });
      setConfirmingId(null);
      setConfirmComment('');
    } catch (err: any) {
      alert(err.detail || err.message || 'Failed to confirm resolution.');
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopeningId || !reopenReason.trim()) return;
    setReopenError('');

    try {
      await reopenMut.mutateAsync({ id: reopeningId, reason: reopenReason.trim() });
      setReopeningId(null);
      setReopenReason('');
    } catch (err: any) {
      setReopenError(err.detail || err.message || 'Failed to reopen complaint.');
    }
  };

  const handleWithdrawSubmit = async () => {
    if (!withdrawingId) return;
    try {
      await withdrawMut.mutateAsync({ id: withdrawingId, reason: withdrawReason });
      setWithdrawingId(null);
      setWithdrawReason('');
    } catch (err: any) {
      alert(err.detail || err.message || 'Failed to withdraw complaint.');
    }
  };

  const counters = data?.counters || {
    active: 0,
    resolved_waiting: 0,
    closed_this_year: 0,
    overdue: 0,
  };

  const allRows: ComplaintSummaryItem[] = data?.complaints || [];
  const filtersChanged = selectedYear !== currentYear || selectedStatus !== 'All' || selectedTypeId !== undefined;
  const resetFilters = () => {
    setSelectedYear(currentYear);
    setSelectedStatus('All');
    setSelectedTypeId(undefined);
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => setPage(1), [selectedYear, selectedStatus, selectedTypeId, pageSize]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(allRows.length / pageSize)));
  const rows = allRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const startWithdraw = (id: number) => {
    setWithdrawingId(id);
    setWithdrawReason('');
  };
  const startConfirm = (id: number) => {
    setConfirmingId(id);
    setConfirmComment('');
  };
  const startReopen = (id: number) => {
    setReopeningId(id);
    setReopenReason('');
    setReopenError('');
  };
  const openAdd = () => {
    setIsAddModalOpen(true);
    setAddError('');
    setDateWarning('');
  };

  /** Extra actions for one complaint, shown in the three-dots menu. */
  const menuActionsFor = (cm: ComplaintSummaryItem): RowAction[] => {
    const list: RowAction[] = [{ label: 'View details', icon: Eye, onClick: () => setViewingComplaintId(cm.complaint_id) }];
    if (cm.status === 'Resolved') {
      list.push({ label: 'Reopen', icon: RotateCcw, danger: true, onClick: () => startReopen(cm.complaint_id) });
    }
    if (['New', 'Open'].includes(cm.status)) {
      list.push({ label: 'Withdraw', icon: XCircle, danger: true, onClick: () => startWithdraw(cm.complaint_id) });
    }
    return list;
  };

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25">
            <AlertCircle className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">My Complaints</h1>
            <p className="mt-0.5 text-sm text-slate-500">Every complaint you have raised. Follow progress and confirm resolutions.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-indigo-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-hidden focus:ring-4 focus:ring-indigo-600/20 active:scale-[0.98] sm:self-auto"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add Complaint
        </button>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Active" value={counters.active} hint="New, Open, In Progress" icon={Clock} tone="text-indigo-600" tile="bg-indigo-50 text-indigo-600 ring-indigo-100" bar="from-indigo-500 to-violet-500" />
        <StatCard label="Resolved" value={counters.resolved_waiting} hint="Waiting for your confirmation" icon={CheckCircle2} tone="text-amber-600" tile="bg-amber-50 text-amber-600 ring-amber-100" bar="from-amber-400 to-orange-400" />
        <StatCard label="Closed this year" value={counters.closed_this_year} hint={`Settled or closed in ${selectedYear}`} icon={XCircle} tone="text-slate-800" tile="bg-emerald-50 text-emerald-600 ring-emerald-100" bar="from-emerald-400 to-teal-400" />
        <StatCard label="Overdue" value={counters.overdue} hint="Past target resolution date" icon={AlertTriangle} tone="text-rose-600" tile="bg-rose-50 text-rose-600 ring-rose-100" bar="from-rose-500 to-pink-500" />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <Field label="Year">
            <SearchableSelect
              value={selectedYear}
              onChange={(v) => setSelectedYear(Number(v))}
              options={[currentYear, currentYear - 1, currentYear - 2].map((y) => ({ value: y, label: String(y) }))}
              className="w-full"
            />
          </Field>

          <Field label="Status">
            <SearchableSelect
              placeholder="All Statuses"
              value={selectedStatus === 'All' ? null : selectedStatus}
              onChange={(v) => setSelectedStatus(v ? String(v) : 'All')}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'New', label: 'New' },
                { value: 'Open', label: 'Open' },
                { value: 'In Progress', label: 'In Progress' },
                { value: 'Resolved', label: 'Resolved' },
                { value: 'Closed', label: 'Closed' },
              ]}
              clearable
              className="w-full"
            />
          </Field>

          <Field label="Complaint type">
            <SearchableSelect
              placeholder="All Types"
              value={selectedTypeId ?? null}
              onChange={(v) => setSelectedTypeId(v ? Number(v) : undefined)}
              options={types.map((t) => ({ value: t.type_id, label: t.name }))}
              clearable
              className="w-full"
            />
          </Field>

          <div className="flex h-10 items-center">
            {filtersChanged && (
              <button type="button" onClick={resetFilters} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
                <FilterX className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Complaints */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <p className="text-sm font-medium text-slate-500">Loading complaints...</p>
          </div>
        ) : allRows.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
              <Inbox className="h-7 w-7" />
            </span>
            <p className="text-base font-semibold text-slate-800">{filtersChanged ? 'No complaints match your filters' : 'You have not raised any complaints'}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Raise a new one any time with the "Add Complaint" button.</p>
            <div className="mt-4 flex justify-center gap-2">
              {filtersChanged && (
                <button type="button" onClick={resetFilters} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                  <FilterX className="h-4 w-4" /> Reset filters
                </button>
              )}
              <button type="button" onClick={openAdd} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700">
                <Plus className="h-4 w-4" /> Add Complaint
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Small screens: one card per complaint */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((c: ComplaintSummaryItem) => (
                <li key={c.complaint_id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => setViewingComplaintId(c.complaint_id)} className="cursor-pointer rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-700">
                      {c.complaint_no}
                    </button>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Badge label={c.status} tone={STATUS_TONE[c.status]} />
                      {c.is_overdue && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 ring-1 ring-rose-100">Overdue</span>}
                    </div>
                  </div>
                  <p className="font-semibold text-slate-900">{c.subject}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{c.type_name}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {c.complaint_date}
                    </span>
                  </div>
                  {c.handler_name && <p className="text-xs text-slate-500">Handler: <span className="font-medium text-slate-700">{c.handler_name}</span></p>}
                  <div className="flex items-center gap-2 pt-1">
                    {c.status === 'Resolved' && (
                      <button type="button" onClick={() => startConfirm(c.complaint_id)} className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-[13px] font-semibold text-white shadow-sm shadow-emerald-600/25 transition hover:bg-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> Confirm
                      </button>
                    )}
                    <div className="ml-auto" />
                    <RowActionsMenu label={`More actions for ${c.complaint_no}`} actions={menuActionsFor(c)} />
                  </div>
                </li>
              ))}
            </ul>

            {/* Larger screens: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-50/95">
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    <th className="whitespace-nowrap px-5 py-3">Complaint No.</th>
                    <th className="whitespace-nowrap px-5 py-3">Date</th>
                    <th className="whitespace-nowrap px-5 py-3">Subject</th>
                    <th className="whitespace-nowrap px-5 py-3">Type</th>
                    <th className="whitespace-nowrap px-5 py-3">Handler</th>
                    <th className="whitespace-nowrap px-5 py-3">Status</th>
                    <th className="whitespace-nowrap px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((c: ComplaintSummaryItem) => (
                    <tr key={c.complaint_id} className={`transition-colors hover:bg-blue-50/30 ${c.is_overdue ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-5 py-3.5">
                        <button type="button" onClick={() => setViewingComplaintId(c.complaint_id)} className="cursor-pointer whitespace-nowrap rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">
                          {c.complaint_no}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{c.complaint_date}</td>
                      <td className="max-w-[16rem] px-5 py-3.5">
                        <span className="block truncate font-medium text-slate-900">{c.subject}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{c.type_name}</td>
                      <td className="px-5 py-3.5">
                        {c.handler_name ? (
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600">
                              {c.handler_name.split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('')}
                            </span>
                            <span className="font-medium text-slate-700">{c.handler_name}</span>
                          </div>
                        ) : (
                          <span className="rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-xs text-slate-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge label={c.status} tone={STATUS_TONE[c.status]} />
                          {c.is_overdue && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 ring-1 ring-rose-100">Overdue</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.status === 'Resolved' && (
                            <button type="button" onClick={() => startConfirm(c.complaint_id)} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-[13px] font-semibold text-white shadow-sm shadow-emerald-600/25 transition hover:bg-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                            </button>
                          )}
                          <RowActionsMenu label={`More actions for ${c.complaint_no}`} actions={menuActionsFor(c)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={safePage} pageSize={pageSize} total={allRows.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: ADD COMPLAINT (BFD Screen 2, Page 11)
         ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-indigo-600" />
                Add Complaint
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitComplaint} className="p-5 space-y-4">
              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                  {addError}
                </div>
              )}

              {dateWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {dateWarning}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject * (5 to 150 characters)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laptop shuts down during client calls"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Complaint Type *
                  </label>
                  <SearchableSelect
                    placeholder="Select Type"
                    value={typeId || null}
                    onChange={(v) => v && handleTypeChange(Number(v))}
                    options={types.map((t) => ({ value: t.type_id, label: t.name }))}
                  />
                  {selectedTypeObj && (
                    <p className="text-[10px] text-indigo-600 mt-1">{selectedTypeObj.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Complaint Date *
                  </label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={complaintDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Related Department *
                  </label>
                  <SearchableSelect
                    placeholder="Select Department"
                    value={relatedDeptId || null}
                    onChange={(v) => setRelatedDeptId(v ? Number(v) : '')}
                    options={deptOptions.map((d: any) => ({ value: d.dep_id || d.id, label: d.name }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Related Project (Optional)
                  </label>
                  <SearchableSelect
                    placeholder="None / Not Project-Related"
                    value={relatedProjectId || null}
                    onChange={(v) => setRelatedProjectId(v ? Number(v) : '')}
                    options={projects.map((p: any) => ({ value: p.project_id || p.id, label: p.project_name || p.name }))}
                    clearable
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description * (20 to 2,000 characters)
                </label>
                <textarea
                  required
                  rows={4}
                  minLength={20}
                  maxLength={2000}
                  placeholder="Describe what happened, where, and what you expect..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks (Optional context, e.g. urgency or availability)
                </label>
                <input
                  type="text"
                  maxLength={1000}
                  placeholder="e.g. I have a client demo on 29 Oct. A spare laptop until then would help."
                  value={initialRemarks}
                  onChange={(e) => setInitialRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* Attachments (up to 5 files, 5 MB each, PDF, JPG, PNG, DOCX) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attachments (Optional: PDF, JPG, PNG, DOCX up to 5 MB each, max 5 files)
                </label>
                <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center bg-slate-50/50 hover:bg-slate-50 transition">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="complaint-file-upload"
                  />
                  <label htmlFor="complaint-file-upload" className="cursor-pointer text-xs text-indigo-600 font-semibold flex items-center justify-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    {isUploading ? 'Uploading...' : 'Choose files or drag & drop'}
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {uploadedFiles.map((f) => (
                      <div key={f.id} className="flex items-center justify-between text-[11px] bg-slate-100 px-2.5 py-1 rounded">
                        <span className="font-medium text-slate-700 truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setUploadedFiles(uploadedFiles.filter((x) => x.id !== f.id))}
                          className="text-slate-400 hover:text-rose-600 ml-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confidential Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confidential-check"
                  disabled={selectedTypeObj?.is_always_confidential}
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="confidential-check" className="text-xs text-slate-700 cursor-pointer">
                  Confidential: only the Admin and the assigned handler can see this complaint
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending || isUploading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {createMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: COMPLAINT DETAILS VIEW (BFD Screen 5, Page 22)
         ========================================================================= */}
      {viewingComplaintId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {isLoadingDetail ? (
              <div className="p-16 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="text-xs font-medium">Loading complaint details...</p>
              </div>
            ) : isErrorDetail || !complaintDetail ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">Failed to load complaint details</p>
                <p className="text-xs text-slate-500">{(detailError as any)?.message || 'An error occurred while loading this complaint.'}</p>
                <button
                  type="button"
                  onClick={() => setViewingComplaintId(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-slate-900">
                        {complaintDetail?.complaint_no}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {complaintDetail?.status}
                      </span>
                      {complaintDetail?.is_overdue && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          Overdue by {complaintDetail?.overdue_days} days
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Submitted on {complaintDetail?.complaint_date} • Handler:{' '}
                      <span className="font-semibold text-slate-700">
                        {complaintDetail?.handler_name || 'Unassigned'}
                      </span>{' '}
                      • Target Date: {complaintDetail?.target_date || '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewingComplaintId(null)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Details & Actions */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Complaint Overview */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subject</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{complaintDetail?.subject}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400">Complaint Type:</span>
                          <span className="font-semibold text-slate-800 ml-1.5">{complaintDetail?.type_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Department:</span>
                          <span className="font-semibold text-slate-800 ml-1.5">{complaintDetail?.related_department_name}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Description</span>
                        <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{complaintDetail?.description}</p>
                      </div>

                      {complaintDetail?.attachments && complaintDetail.attachments.length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Attachments</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {complaintDetail.attachments.map((f) => (
                              <a
                                key={f.attachment_id}
                                href={f.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-indigo-600 font-medium hover:underline"
                              >
                                📎 {f.file_name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Taken Section (BFD Pg 22 Marker 4) */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        Actions Taken ({complaintDetail?.actions?.length || 0})
                      </h4>
                      {(!complaintDetail?.actions || complaintDetail.actions.length === 0) ? (
                        <p className="text-xs text-slate-400 italic">No investigation actions recorded yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {complaintDetail.actions.map((act) => (
                            <div key={act.action_id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                              <div className="flex items-center justify-between text-slate-500">
                                <span className="font-semibold text-slate-800">{act.action_date}</span>
                                <span>by {act.created_by_name}</span>
                              </div>
                              <p className="text-slate-700">{act.action_text}</p>
                              {act.files && act.files.length > 0 && (
                                <div className="mt-1 flex gap-2">
                                  {act.files.map((file) => (
                                    <a key={file.attachment_id} href={file.file_url} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 underline">
                                      📎 {file.file_name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Resolutions Recorded */}
                    {complaintDetail?.resolutions && complaintDetail.resolutions.length > 0 && (
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Resolution Outcome: {complaintDetail.resolutions[0].outcome}
                          </h4>
                          <span className="text-[11px] text-emerald-700 font-semibold">
                            Status: {complaintDetail.resolutions[0].employee_confirmation_status}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800 whitespace-pre-wrap">
                          {complaintDetail.resolutions[0].resolution_details}
                        </p>
                      </div>
                    )}

                    {/* Remarks Thread (BFD Pg 22 Marker 5) */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                        Remarks Thread
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                        {complaintDetail.remarks.map((rem) => (
                          <div key={rem.remark_id} className="p-2.5 rounded-lg text-xs bg-slate-50 border border-slate-200">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                              <span className="font-semibold text-slate-700">{rem.created_by_name}</span>
                              <span>{new Date(rem.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-800">{rem.remark_text}</p>
                          </div>
                        ))}
                      </div>

                      {complaintDetail?.status !== 'Closed' && (
                        <form onSubmit={handleSendRemark} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Type a remark or reply..."
                            value={newRemarkText}
                            onChange={(e) => setNewRemarkText(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                          />
                          <button
                            type="submit"
                            disabled={addRemarkMut.isPending}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                          >
                            Send
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Right Column: History Timeline (BFD Pg 22 Marker 6) */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Complaint History</h4>
                    <div className="space-y-3 text-xs max-h-96 overflow-y-auto">
                      {complaintDetail.history.map((h) => (
                        <div key={h.history_id} className="border-l-2 border-indigo-400 pl-2.5 space-y-0.5">
                          <div className="font-semibold text-slate-800">{h.event}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(h.created_at).toLocaleString()} • {h.performed_by_name}
                          </div>
                          {h.remarks && <p className="text-[11px] text-slate-600">{h.remarks}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: REOPEN COMPLAINT
         ========================================================================= */}
      {reopeningId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              Reopen Complaint
            </h3>
            <p className="text-xs text-slate-500">
              Please explain why the issue was not settled. This will move the complaint back to In Progress with the same handler.
            </p>

            {reopenError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
                {reopenError}
              </div>
            )}

            <form onSubmit={handleReopenSubmit} className="space-y-3">
              <textarea
                required
                rows={3}
                minLength={10}
                maxLength={1000}
                placeholder="Reason for reopening (10 to 1,000 characters)..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReopeningId(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reopenMut.isPending}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                >
                  Reopen Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: CONFIRM RESOLUTION
         ========================================================================= */}
      {confirmingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Confirm Resolution
            </h3>
            <p className="text-xs text-slate-500">
              Confirm that this issue has been settled. The Admin will be notified to officially close the complaint.
            </p>

            <input
              type="text"
              maxLength={500}
              placeholder="Optional comment (e.g. Working fine now, thank you)..."
              value={confirmComment}
              onChange={(e) => setConfirmComment(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingId(null)}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={confirmMut.isPending}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: WITHDRAW COMPLAINT
         ========================================================================= */}
      {withdrawingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-slate-600" />
              Withdraw Complaint
            </h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to withdraw this complaint? It will be marked Closed with Closure Type "Withdrawn".
            </p>

            <input
              type="text"
              maxLength={1000}
              placeholder="Optional withdrawal reason..."
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWithdrawingId(null)}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawSubmit}
                disabled={withdrawMut.isPending}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold"
              >
                Withdraw Complaint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
