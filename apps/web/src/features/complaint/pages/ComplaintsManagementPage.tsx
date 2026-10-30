import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Search,
  Settings,
  BarChart3,
  Loader2,
  X,
  Play,
} from 'lucide-react';
import {
  useAllComplaintsQuery,
  useComplaintDetailsQuery,
  useAcceptAndAssignMutation,
  useCloseWithoutActionMutation,
  useReassignHandlerMutation,
  useChangeTargetDateMutation,
  useStartWorkMutation,
  useAddActionMutation,
  useAddRemarkMutation,
  useRecordResolutionMutation,
  useSendBackMutation,
  useCloseComplaintMutation,
  ComplaintSummaryItem,
  CloseWithoutActionReason,
  ResolutionOutcome,
} from '../hooks/use-complaints';
import {
  useComplaintTypesQuery,
  useComplaintSettingsQuery,
  ComplaintPriority,
} from '../hooks/use-complaint-settings';
import {
  useDepartmentOptionsQuery,
  useEmployeeOptionsQuery,
} from '@/features/organization/hooks/use-organization';
import { useAuth } from '@/features/auth/context/AuthContext';

export const ComplaintsManagementPage: React.FC = (): React.ReactElement => {
  const { user } = useAuth();
  const isAdmin = !!user?.access?.can_manage_organization;
  const [activeTab, setActiveTab] = useState<'Active' | 'New' | 'Resolved' | 'Closed' | 'All'>('Active');
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>(undefined);
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(undefined);
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedHandlerId, setSelectedHandlerId] = useState<number | undefined>(undefined);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const { data, isLoading } = useAllComplaintsQuery({
    tab: activeTab,
    type_id: selectedTypeId,
    department_id: selectedDeptId,
    priority: selectedPriority || undefined,
    handler_id: selectedHandlerId,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    search: searchQuery || undefined,
  });

  const { data: types = [] } = useComplaintTypesQuery(true);
  const { data: settings } = useComplaintSettingsQuery();
  const { data: deptOptions = [] } = useDepartmentOptionsQuery();
  const { data: empOptions = [] } = useEmployeeOptionsQuery();

  // Mutations
  const acceptMut = useAcceptAndAssignMutation();
  const closeWithoutActionMut = useCloseWithoutActionMutation();
  const reassignMut = useReassignHandlerMutation();
  const changeTargetMut = useChangeTargetDateMutation();
  const startWorkMut = useStartWorkMutation();
  const addActionMut = useAddActionMutation();
  const addRemarkMut = useAddRemarkMutation();
  const resolveMut = useRecordResolutionMutation();
  const sendBackMut = useSendBackMutation();
  const closeMut = useCloseComplaintMutation();

  // Details Modal
  const [viewingComplaintId, setViewingComplaintId] = useState<number | null>(null);
  const { data: detail, isLoading: isLoadingDetail, isError: isErrorDetail, error: detailError } = useComplaintDetailsQuery(viewingComplaintId);

  // Accept & Assign Modal
  const [acceptingComplaintId, setAcceptingComplaintId] = useState<number | null>(null);
  const [assignHandlerId, setAssignHandlerId] = useState<number | ''>('');
  const [assignPriority, setAssignPriority] = useState<ComplaintPriority>('Medium');
  const [assignTargetDate, setAssignTargetDate] = useState<string>('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [assignError, setAssignError] = useState('');

  // Close Without Action Modal
  const [closingWithoutActionId, setClosingWithoutActionId] = useState<number | null>(null);
  const [closeReason, setCloseReason] = useState<CloseWithoutActionReason>('Duplicate');
  const [closeRemarks, setCloseRemarks] = useState('');
  const [linkedDuplicateId, setLinkedDuplicateId] = useState<number | ''>('');
  const [closeWithoutActionError, setCloseWithoutActionError] = useState('');

  // Action Taken Form (Inside Details)
  const [actionText, setActionText] = useState('');
  const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0]);

  // Remarks Form (Inside Details)
  const [remarkText, setRemarkText] = useState('');
  const [isInternalRemark, setIsInternalRemark] = useState(false);

  // Record Resolution Modal / Drawer
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resOutcome, setResOutcome] = useState<ResolutionOutcome>('Resolved – issue fixed');
  const [resDetails, setResDetails] = useState('');
  const [resRootCause, setResRootCause] = useState('');
  const [resError, setResError] = useState('');

  // Reassign Modal
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [newHandlerId, setNewHandlerId] = useState<number | ''>('');
  const [reassignReason, setReassignReason] = useState('');

  // Change Target Modal
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [newTargetDate, setNewTargetDate] = useState('');
  const [targetReason, setTargetReason] = useState('');

  // Send Back Modal
  const [isSendBackModalOpen, setIsSendBackModalOpen] = useState(false);
  const [sendBackRemarks, setSendBackRemarks] = useState('');

  // Open Accept & Assign Modal
  const openAcceptModal = (c: ComplaintSummaryItem) => {
    setAcceptingComplaintId(c.complaint_id);
    const typeObj = types.find((t) => t.type_id === c.type_id);
    const defaultPrio = typeObj?.default_priority || 'Medium';
    setAssignPriority(defaultPrio);
    setAssignHandlerId(typeObj?.default_handler_id || '');

    // Calculate default target date from priority & settings
    let days = 7;
    if (defaultPrio === 'Low') days = settings?.target_days_low || 15;
    else if (defaultPrio === 'High') days = settings?.target_days_high || 3;
    else if (defaultPrio === 'Urgent') days = settings?.target_days_urgent || 1;
    else days = settings?.target_days_medium || 7;

    const tDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setAssignTargetDate(tDate.toISOString().split('T')[0]);
    setAssignRemarks('');
    setAssignError('');
  };

  const handlePriorityChangeInAssign = (prio: ComplaintPriority) => {
    setAssignPriority(prio);
    let days = 7;
    if (prio === 'Low') days = settings?.target_days_low || 15;
    else if (prio === 'High') days = settings?.target_days_high || 3;
    else if (prio === 'Urgent') days = settings?.target_days_urgent || 1;
    else days = settings?.target_days_medium || 7;

    const tDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setAssignTargetDate(tDate.toISOString().split('T')[0]);
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptingComplaintId || !assignHandlerId) {
      setAssignError('Please select an active handler.');
      return;
    }
    setAssignError('');

    try {
      await acceptMut.mutateAsync({
        id: acceptingComplaintId,
        data: {
          handler_id: Number(assignHandlerId),
          priority: assignPriority,
          target_date: assignTargetDate,
          remarks: assignRemarks.trim() || undefined,
        },
      });
      setAcceptingComplaintId(null);
    } catch (err: any) {
      setAssignError(err.message || 'Failed to accept and assign complaint.');
    }
  };

  const handleCloseWithoutActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingWithoutActionId || !closeRemarks.trim()) {
      setCloseWithoutActionError('Remarks to employee are required.');
      return;
    }
    setCloseWithoutActionError('');

    try {
      await closeWithoutActionMut.mutateAsync({
        id: closingWithoutActionId,
        data: {
          reason: closeReason,
          remarks: closeRemarks.trim(),
          linked_complaint_id: linkedDuplicateId ? Number(linkedDuplicateId) : undefined,
        },
      });
      setClosingWithoutActionId(null);
    } catch (err: any) {
      setCloseWithoutActionError(err.message || 'Failed to close complaint without action.');
    }
  };

  const handleAddActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingComplaintId || !actionText.trim()) return;

    try {
      await addActionMut.mutateAsync({
        id: viewingComplaintId,
        data: {
          action_date: actionDate,
          action_text: actionText.trim(),
        },
      });
      setActionText('');
    } catch (err: any) {
      alert(err.message || 'Failed to add action.');
    }
  };

  const handleAddRemarkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingComplaintId || !remarkText.trim()) return;

    try {
      await addRemarkMut.mutateAsync({
        id: viewingComplaintId,
        data: {
          remark_text: remarkText.trim(),
          is_internal: isInternalRemark,
        },
      });
      setRemarkText('');
    } catch (err: any) {
      alert(err.message || 'Failed to add remark.');
    }
  };

  const handleRecordResolutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingComplaintId || !resDetails.trim()) {
      setResError('Resolution details are required (20 to 2,000 characters).');
      return;
    }
    setResError('');

    try {
      await resolveMut.mutateAsync({
        id: viewingComplaintId,
        data: {
          outcome: resOutcome,
          resolution_details: resDetails.trim(),
          root_cause: resRootCause.trim() || undefined,
        },
      });
      setIsResolveModalOpen(false);
      setResDetails('');
      setResRootCause('');
    } catch (err: any) {
      setResError(err.message || 'Failed to record resolution.');
    }
  };

  const handleCloseComplaintSubmit = async () => {
    if (!viewingComplaintId) return;
    try {
      await closeMut.mutateAsync({ id: viewingComplaintId });
    } catch (err: any) {
      alert(err.message || 'Failed to close complaint.');
    }
  };

  const handleSendBackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingComplaintId || !sendBackRemarks.trim()) return;
    try {
      await sendBackMut.mutateAsync({
        id: viewingComplaintId,
        remarks: sendBackRemarks.trim(),
      });
      setIsSendBackModalOpen(false);
      setSendBackRemarks('');
    } catch (err: any) {
      alert(err.message || 'Failed to send back complaint.');
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingComplaintId || !newHandlerId || !reassignReason.trim()) return;
    try {
      await reassignMut.mutateAsync({
        id: viewingComplaintId,
        handler_id: Number(newHandlerId),
        reason: reassignReason.trim(),
      });
      setIsReassignModalOpen(false);
      setNewHandlerId('');
      setReassignReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to reassign handler.');
    }
  };

  const handleChangeTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingComplaintId || !newTargetDate || !targetReason.trim()) return;
    try {
      await changeTargetMut.mutateAsync({
        id: viewingComplaintId,
        target_date: newTargetDate,
        reason: targetReason.trim(),
      });
      setIsTargetModalOpen(false);
      setNewTargetDate('');
      setTargetReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to update target date.');
    }
  };

  const counters = data?.counters || {
    new_waiting: 0,
    open_or_in_progress: 0,
    overdue: 0,
    avg_days_to_resolve_this_month: 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertCircle className="w-7 h-7 text-indigo-600" />
            {isAdmin ? 'Complaints Management' : 'Assigned Complaints'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Review submitted employee complaints, assign handlers, track investigation progress, and close resolved issues.'
              : 'Complaints assigned to you to investigate and resolve.'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              to="/complaints?tab=reports"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Complaint Reports
            </Link>
            <Link
              to="/admin/settings/complaint-settings"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              Settings
            </Link>
          </div>
        )}
      </div>

      {/* 4 Counters (BFD Page 16 Marker 1) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{counters.new_waiting}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Waiting for review</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open or In Progress</span>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{counters.open_or_in_progress}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Being investigated</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Play className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">{counters.overdue}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Past Target Date</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Time to Resolve</span>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {counters.avg_days_to_resolve_this_month} <span className="text-xs font-normal text-slate-500">days</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Settled this month</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs (BFD Page 16 Marker 3) */}
      <div className="flex border-b border-slate-200 gap-6">
        {(['Active', 'New', 'Resolved', 'Closed', 'All'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab}
            {tab === 'New' && counters.new_waiting > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {counters.new_waiting}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter Toolbar (BFD Page 16 Marker 4) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <select
          value={selectedTypeId || ''}
          onChange={(e) => setSelectedTypeId(e.target.value ? Number(e.target.value) : undefined)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t.type_id} value={t.type_id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          value={selectedDeptId || ''}
          onChange={(e) => setSelectedDeptId(e.target.value ? Number(e.target.value) : undefined)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Departments</option>
          {deptOptions.map((d: any) => (
            <option key={d.dep_id || d.id} value={d.dep_id || d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>

        <select
          value={selectedHandlerId || ''}
          onChange={(e) => setSelectedHandlerId(e.target.value ? Number(e.target.value) : undefined)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Handlers</option>
          {empOptions.map((emp: any) => (
            <option key={emp.emp_id || emp.id} value={emp.emp_id || emp.id}>
              {emp.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
          title="From Date"
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
          title="To Date"
        />

        <div className="relative flex-1 min-w-[180px]">
          <input
            type="text"
            placeholder="Search by Complaint No., subject or complainant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2.5 py-1.5 pl-8 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
        </div>
      </div>

      {/* Complaints Table (BFD Reference Screen 3) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
            <p className="text-xs">Loading complaints...</p>
          </div>
        ) : (data?.complaints || []).length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No complaints in this view</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Complaint No.</th>
                  <th className="py-3 px-4">Raised By</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Target Date</th>
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
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{c.complainant_name}</div>
                      <div className="text-[10px] text-slate-400">{c.department_name}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                      {c.is_confidential ? (
                        <span className="flex items-center gap-1 text-slate-600 font-semibold italic">
                          <Lock className="w-3 h-3 text-amber-600" /> Confidential
                        </span>
                      ) : (
                        c.subject
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{c.type_name}</td>
                    <td className="py-3 px-4">
                      {c.priority && c.priority !== '—' ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            c.priority === 'Urgent'
                              ? 'bg-rose-100 text-rose-800'
                              : c.priority === 'High'
                              ? 'bg-amber-100 text-amber-800'
                              : c.priority === 'Medium'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.priority}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
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
                    </td>
                    <td className="py-3 px-4">
                      {c.target_date ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-700 font-medium">{c.target_date}</span>
                          {c.is_overdue && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              Overdue
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.status === 'New' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openAcceptModal(c)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold cursor-pointer shadow-xs"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => {
                              setClosingWithoutActionId(c.complaint_id);
                              setCloseReason('Duplicate');
                              setCloseRemarks('');
                              setLinkedDuplicateId('');
                              setCloseWithoutActionError('');
                            }}
                            className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded font-semibold cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setViewingComplaintId(c.complaint_id)}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        >
                          Open
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: ACCEPT & ASSIGN (BFD Screen 4, Page 18)
         ========================================================================= */}
      {acceptingComplaintId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                Accept & Assign Complaint
              </h3>
              <button
                onClick={() => setAcceptingComplaintId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAcceptSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Handler *</label>
                <select
                  required
                  value={assignHandlerId}
                  onChange={(e) => setAssignHandlerId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="">Select Active Employee</option>
                  {empOptions.map((emp: any) => (
                    <option key={emp.emp_id || emp.id} value={emp.emp_id || emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">The complainant cannot be chosen as handler.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Low', 'Medium', 'High', 'Urgent'] as ComplaintPriority[]).map((prio) => (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => handlePriorityChangeInAssign(prio)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                        assignPriority === prio
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {prio}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Resolution Date *</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={assignTargetDate}
                  onChange={(e) => setAssignTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks (Optional note to handler and employee)</label>
                <input
                  type="text"
                  maxLength={1000}
                  placeholder="e.g. Please give a spare laptop first, then check the machine."
                  value={assignRemarks}
                  onChange={(e) => setAssignRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAcceptingComplaintId(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={acceptMut.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Accept & Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: CLOSE WITHOUT ACTION (BFD Page 19)
         ========================================================================= */}
      {closingWithoutActionId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                Close Without Action
              </h3>
              <button
                onClick={() => setClosingWithoutActionId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {closeWithoutActionError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                {closeWithoutActionError}
              </div>
            )}

            <form onSubmit={handleCloseWithoutActionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason *</label>
                <select
                  required
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value as CloseWithoutActionReason)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="Duplicate">Duplicate (same matter already raised)</option>
                  <option value="Not a complaint">Not a complaint (request or general question)</option>
                  <option value="Belongs to another process">Belongs to another process (Support / Expense / IC)</option>
                  <option value="Not enough information">Not enough information (no reply in 7 days)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {closeReason === 'Duplicate' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Link Original Complaint</label>
                  <select
                    value={linkedDuplicateId}
                    onChange={(e) => setLinkedDuplicateId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="">Select Original Complaint</option>
                    {(data?.complaints || [])
                      .filter((c) => c.complaint_id !== closingWithoutActionId)
                      .map((c) => (
                        <option key={c.complaint_id} value={c.complaint_id}>
                          {c.complaint_no} - {c.subject}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks to Employee * (Mandatory explanation)
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={1000}
                  placeholder="Explain why this complaint is being closed without action..."
                  value={closeRemarks}
                  onChange={(e) => setCloseRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setClosingWithoutActionId(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closeWithoutActionMut.isPending}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Close Without Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: FULL COMPLAINT DETAILS & ACTIONS (BFD Screen 5)
         ========================================================================= */}
      {viewingComplaintId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {isLoadingDetail ? (
              <div className="p-16 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="text-xs font-medium">Loading complaint details...</p>
              </div>
            ) : isErrorDetail || !detail ? (
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
            ) : detail && (
              <div>
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 bg-white z-10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-slate-900">{detail?.complaint_no}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {detail?.status}
                      </span>
                      {detail?.is_overdue && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          Overdue by {detail?.overdue_days} days
                        </span>
                      )}
                      {detail?.is_confidential && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
                          <Lock className="w-3 h-3" /> Confidential
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Raised by <span className="font-semibold text-slate-800">{detail?.complainant_name}</span> (
                      {detail?.related_department_name}) on {detail?.complaint_date} • Handler:{' '}
                      <span className="font-semibold text-slate-800">{detail?.handler_name || 'Unassigned'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Handler Start Work button */}
                    {detail?.status === 'Open' && (
                      <button
                        onClick={() => detail?.complaint_id && startWorkMut.mutate(detail.complaint_id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" /> Start Work
                      </button>
                    )}

                    {/* Record Resolution button */}
                    {detail?.status === 'In Progress' && (
                      <button
                        onClick={() => {
                          setIsResolveModalOpen(true);
                          setResDetails('');
                          setResRootCause('');
                          setResError('');
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Record Resolution
                      </button>
                    )}

                    {/* Admin Close Complaint / Send Back button */}
                    {detail?.status === 'Resolved' && (
                      <>
                        <button
                          onClick={handleCloseComplaintSubmit}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold"
                        >
                          Close Complaint
                        </button>
                        <button
                          onClick={() => {
                            setIsSendBackModalOpen(true);
                            setSendBackRemarks('');
                          }}
                          className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold"
                        >
                          Send Back
                        </button>
                      </>
                    )}

                    {/* Admin Management options for Open or In Progress */}
                    {detail?.status && ['Open', 'In Progress'].includes(detail.status) && (
                      <>
                        <button
                          onClick={() => {
                            setIsReassignModalOpen(true);
                            setNewHandlerId('');
                            setReassignReason('');
                          }}
                          className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold"
                        >
                          Reassign
                        </button>
                        <button
                          onClick={() => {
                            setIsTargetModalOpen(true);
                            setNewTargetDate(detail?.target_date || '');
                            setTargetReason('');
                          }}
                          className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold"
                        >
                          Target Date
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setViewingComplaintId(null)}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Complaint Details & Actions & Remarks */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Complaint Overview */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subject</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{detail?.subject}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400">Type:</span>
                          <span className="font-semibold text-slate-800 ml-1.5">{detail?.type_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Department:</span>
                          <span className="font-semibold text-slate-800 ml-1.5">{detail?.related_department_name}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Description</span>
                        <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{detail?.description}</p>
                      </div>

                      {detail?.attachments && detail.attachments.length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Attachments</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {detail.attachments.map((f) => (
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

                    {/* Actions Taken Section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          Actions Taken ({detail?.actions?.length || 0})
                        </h4>
                      </div>

                      {(!detail?.actions || detail.actions.length === 0) ? (
                        <p className="text-xs text-slate-400 italic">No actions recorded yet.</p>
                      ) : (
                        <div className="space-y-2 mb-3">
                          {detail.actions.map((act) => (
                            <div key={act.action_id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                              <div className="flex items-center justify-between text-slate-500">
                                <span className="font-semibold text-slate-800">{act.action_date}</span>
                                <span>by {act.created_by_name}</span>
                              </div>
                              <p className="text-slate-700">{act.action_text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Action Form for Handler / Admin */}
                      {detail?.status && ['Open', 'In Progress'].includes(detail.status) && (
                        <form onSubmit={handleAddActionSubmit} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                          <span className="text-[11px] font-semibold text-slate-700 block">Record New Action</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="date"
                              required
                              value={actionDate}
                              onChange={(e) => setActionDate(e.target.value)}
                              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded"
                            />
                            <input
                              type="text"
                              required
                              minLength={10}
                              maxLength={1000}
                              placeholder="Action taken (e.g. Spare laptop VP-LT-0118 given)..."
                              value={actionText}
                              onChange={(e) => setActionText(e.target.value)}
                              className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={addActionMut.isPending}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold"
                            >
                              Add Action
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* Remarks Thread */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Remarks Thread</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                        {detail?.remarks?.map((rem) => (
                          <div
                            key={rem.remark_id}
                            className={`p-2.5 rounded-lg text-xs border ${
                              rem.is_internal
                                ? 'bg-amber-50/50 border-dashed border-amber-300'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                {rem.created_by_name}
                                {rem.is_internal && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Internal
                                  </span>
                                )}
                              </span>
                              <span>{new Date(rem.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-800">{rem.remark_text}</p>
                          </div>
                        ))}
                      </div>

                      {detail?.status !== 'Closed' && (
                        <form onSubmit={handleAddRemarkSubmit} className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Type a remark or question..."
                              value={remarkText}
                              onChange={(e) => setRemarkText(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                            />
                            <button
                              type="submit"
                              disabled={addRemarkMut.isPending}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                            >
                              Post
                            </button>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isInternalRemark}
                              onChange={(e) => setIsInternalRemark(e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] text-slate-600">
                              Internal remark (seen only by Admin & Handler, hidden from employee)
                            </span>
                          </label>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Right Column: History Timeline */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Complaint History</h4>
                    <div className="space-y-3 text-xs max-h-96 overflow-y-auto">
                      {detail?.history?.map((h) => (
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
          MODAL 4: RECORD RESOLUTION (BFD Screen 6)
         ========================================================================= */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Record Resolution
            </h3>

            {resError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                {resError}
              </div>
            )}

            <form onSubmit={handleRecordResolutionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Outcome *</label>
                <select
                  value={resOutcome}
                  onChange={(e) => setResOutcome(e.target.value as ResolutionOutcome)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="Resolved – issue fixed">Resolved – issue fixed</option>
                  <option value="Resolved – explained">Resolved – explained</option>
                  <option value="Partly resolved">Partly resolved</option>
                  <option value="Not upheld">Not upheld</option>
                  <option value="Action taken">Action taken</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Details * (20 to 2,000 chars, visible to employee)
                </label>
                <textarea
                  required
                  rows={4}
                  minLength={20}
                  maxLength={2000}
                  placeholder="Explain what was done and the result..."
                  value={resDetails}
                  onChange={(e) => setResDetails(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Root Cause (Optional, Internal: seen by Handler & Admin, used in reports)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  placeholder="e.g. Dust in the cooling fan"
                  value={resRootCause}
                  onChange={(e) => setResRootCause(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveMut.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Mark as Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: REASSIGN HANDLER
         ========================================================================= */}
      {isReassignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reassign Handler</h3>
            <form onSubmit={handleReassignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Handler *</label>
                <select
                  required
                  value={newHandlerId}
                  onChange={(e) => setNewHandlerId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Handler</option>
                  {empOptions.map((emp: any) => (
                    <option key={emp.emp_id || emp.id} value={emp.emp_id || emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason *</label>
                <input
                  type="text"
                  required
                  maxLength={500}
                  placeholder="Reason for reassignment..."
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReassignModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassignMut.isPending}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold"
                >
                  Reassign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 6: CHANGE TARGET DATE
         ========================================================================= */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Change Target Date</h3>
            <form onSubmit={handleChangeTargetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Target Date *</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason *</label>
                <input
                  type="text"
                  required
                  maxLength={500}
                  placeholder="Reason for changing target date..."
                  value={targetReason}
                  onChange={(e) => setTargetReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changeTargetMut.isPending}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold"
                >
                  Update Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 7: SEND BACK TO HANDLER
         ========================================================================= */}
      {isSendBackModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Send Back to Handler</h3>
            <form onSubmit={handleSendBackSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks *</label>
                <textarea
                  required
                  rows={3}
                  maxLength={1000}
                  placeholder="Explain what needs further investigation..."
                  value={sendBackRemarks}
                  onChange={(e) => setSendBackRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSendBackModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendBackMut.isPending}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-semibold"
                >
                  Send Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
