import React, { useState } from 'react';
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertCircle className="w-7 h-7 text-indigo-600" />
            My Complaints
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Every complaint you have raised. Follow progress, communicate with handlers, and confirm resolutions.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setAddError('');
            setDateWarning('');
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Complaint
        </button>
      </div>

      {/* 4 Counters (BFD Page 8 Marker 1) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</span>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{counters.active}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">New, Open, In Progress</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{counters.resolved_waiting}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Waiting for your confirmation</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Closed This Year</span>
            <div className="text-2xl font-bold text-slate-700 mt-1">{counters.closed_this_year}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Settled or closed in {selectedYear}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">{counters.overdue}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Past target resolution date</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters (BFD Page 8 Marker 3) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Complaint Type:</span>
          <select
            value={selectedTypeId || ''}
            onChange={(e) => setSelectedTypeId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            {types.map((t) => (
              <option key={t.type_id} value={t.type_id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Complaints Table (BFD Page 8 Reference Screen 1) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
            <p className="text-xs">Loading complaints...</p>
          </div>
        ) : (data?.complaints || []).length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No complaints match your filters</p>
            <p className="text-xs text-slate-500 mt-1">You can raise a new complaint using the "+ Add Complaint" button.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Complaint No.</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Handler</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.complaints || []).map((c: ComplaintSummaryItem) => (
                  <tr key={c.complaint_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-600">
                      <button
                        onClick={() => setViewingComplaintId(c.complaint_id)}
                        className="hover:underline cursor-pointer"
                      >
                        {c.complaint_no}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{c.complaint_date}</td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                      {c.subject}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{c.type_name}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{c.handler_name}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            c.status === 'Resolved'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : c.status === 'Closed'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : c.status === 'In Progress'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : c.status === 'Open'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {c.status}
                        </span>
                        {c.is_overdue && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingComplaintId(c.complaint_id)}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        >
                          View
                        </button>

                        {/* Withdraw option for New or Open (BFD Pg 8 Marker 7) */}
                        {['New', 'Open'].includes(c.status) && (
                          <button
                            onClick={() => {
                              setWithdrawingId(c.complaint_id);
                              setWithdrawReason('');
                            }}
                            className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                          >
                            Withdraw
                          </button>
                        )}

                        {/* Confirm / Reopen for Resolved */}
                        {c.status === 'Resolved' && (
                          <>
                            <button
                              onClick={() => {
                                setConfirmingId(c.complaint_id);
                                setConfirmComment('');
                              }}
                              className="text-emerald-600 hover:text-emerald-800 font-semibold cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                setReopeningId(c.complaint_id);
                                setReopenReason('');
                                setReopenError('');
                              }}
                              className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                            >
                              Reopen
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  <select
                    required
                    value={typeId}
                    onChange={(e) => handleTypeChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="">Select Type</option>
                    {types.map((t) => (
                      <option key={t.type_id} value={t.type_id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
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
                  <select
                    required
                    value={relatedDeptId}
                    onChange={(e) => setRelatedDeptId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="">Select Department</option>
                    {deptOptions.map((d: any) => (
                      <option key={d.dep_id || d.id} value={d.dep_id || d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Related Project (Optional)
                  </label>
                  <select
                    value={relatedProjectId}
                    onChange={(e) => setRelatedProjectId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="">None / Not Project-Related</option>
                    {projects.map((p: any) => (
                      <option key={p.project_id || p.id} value={p.project_id || p.id}>
                        {p.project_name || p.name}
                      </option>
                    ))}
                  </select>
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
