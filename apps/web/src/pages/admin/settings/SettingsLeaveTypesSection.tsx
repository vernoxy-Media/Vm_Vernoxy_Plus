import React, { useState } from 'react';
import {
  CalendarOff,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Save,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  useLeaveTypesQuery,
  useCreateLeaveTypeMutation,
  useUpdateLeaveTypeMutation,
  useToggleLeaveTypeStatusMutation,
  useDeleteLeaveTypeMutation,
  useLeavePoliciesQuery,
  useCreateLeavePolicyMutation,
  useUpdateLeavePolicyMutation,
  useCopyLeavePolicyMutation,
  useLeaveGeneralSettingsQuery,
  useUpdateLeaveGeneralSettingsMutation,
  useLeaveSettingsChangeLogQuery,
  LeaveType,
  LeavePolicy,
} from '../../../hooks/use-leave';

const COLOR_OPTIONS = [
  { label: 'Blue', value: 'blue', bg: 'bg-blue-100 text-blue-700 border-blue-300' },
  { label: 'Emerald', value: 'emerald', bg: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { label: 'Amber', value: 'amber', bg: 'bg-amber-100 text-amber-700 border-amber-300' },
  { label: 'Purple', value: 'purple', bg: 'bg-purple-100 text-purple-700 border-purple-300' },
  { label: 'Rose', value: 'rose', bg: 'bg-rose-100 text-rose-700 border-rose-300' },
  { label: 'Indigo', value: 'indigo', bg: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { label: 'Slate', value: 'slate', bg: 'bg-slate-100 text-slate-700 border-slate-300' },
];

export const SettingsLeaveTypesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'types' | 'policies' | 'general' | 'changelog'>('types');

  // Queries
  const { data: leaveTypes = [] } = useLeaveTypesQuery();
  const { data: leavePolicies = [] } = useLeavePoliciesQuery();
  const { data: generalSettings } = useLeaveGeneralSettingsQuery();
  const { data: changeLogs = [] } = useLeaveSettingsChangeLogQuery();

  // Mutations
  const createTypeMut = useCreateLeaveTypeMutation();
  const updateTypeMut = useUpdateLeaveTypeMutation();
  const toggleTypeMut = useToggleLeaveTypeStatusMutation();
  const deleteTypeMut = useDeleteLeaveTypeMutation();

  const createPolicyMut = useCreateLeavePolicyMutation();
  const updatePolicyMut = useUpdateLeavePolicyMutation();
  const copyPolicyMut = useCopyLeavePolicyMutation();
  const updateGeneralMut = useUpdateLeaveGeneralSettingsMutation();

  // Leave Type Modal State
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [typeForm, setTypeForm] = useState({
    name: '',
    code: '',
    is_paid: true,
    balance_tracked: true,
    half_day_allowed: true,
    applies_to: 'ALL' as 'ALL' | 'FEMALE_ONLY' | 'MALE_ONLY',
    calendar_color: 'blue',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });
  const [typeError, setTypeError] = useState('');

  // Policy Modal State
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [policyForm, setPolicyForm] = useState({
    name: '',
    pro_rata: true,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    rules: [] as any[],
  });
  const [policyError, setPolicyError] = useState('');

  // Copy Policy Modal State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceId, setCopySourceId] = useState<number | null>(null);
  const [copyNewName, setCopyNewName] = useState('');

  // General Settings Form
  const [generalForm, setGeneralForm] = useState<any>(null);
  const [generalSuccess, setGeneralSuccess] = useState(false);

  React.useEffect(() => {
    if (generalSettings && !generalForm) {
      setGeneralForm({
        leave_year_start: generalSettings.leave_year_start,
        count_sandwich_leave: generalSettings.count_sandwich_leave,
        pending_reminder_hours: generalSettings.pending_reminder_hours,
        approve_after_leave_started: generalSettings.approve_after_leave_started,
        year_end_processing: generalSettings.year_end_processing,
        comp_off_hours_per_day: generalSettings.comp_off_hours_per_day,
      });
    }
  }, [generalSettings, generalForm]);

  // Open Add/Edit Leave Type Modal
  const handleOpenTypeModal = (type?: LeaveType) => {
    if (type) {
      setEditingType(type);
      setTypeForm({
        name: type.name,
        code: type.code,
        is_paid: type.is_paid,
        balance_tracked: type.balance_tracked,
        half_day_allowed: type.half_day_allowed,
        applies_to: type.applies_to,
        calendar_color: type.calendar_color,
        description: type.description || '',
        status: type.status,
      });
    } else {
      setEditingType(null);
      setTypeForm({
        name: '',
        code: '',
        is_paid: true,
        balance_tracked: true,
        half_day_allowed: true,
        applies_to: 'ALL',
        calendar_color: 'blue',
        description: '',
        status: 'ACTIVE',
      });
    }
    setTypeError('');
    setIsTypeModalOpen(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setTypeError('');
    try {
      if (editingType) {
        await updateTypeMut.mutateAsync({ id: editingType.leave_type_id, data: typeForm });
      } else {
        await createTypeMut.mutateAsync(typeForm);
      }
      setIsTypeModalOpen(false);
    } catch (err: any) {
      setTypeError(err?.message || 'Failed to save leave type.');
    }
  };

  // Open Add/Edit Policy Modal
  const handleOpenPolicyModal = (policy?: LeavePolicy) => {
    if (policy) {
      setEditingPolicy(policy);
      setPolicyForm({
        name: policy.name,
        pro_rata: policy.pro_rata,
        status: policy.status,
        rules: (policy.rules || []).map((r) => ({
          leave_type_id: r.leave_type_id,
          days_per_year: r.days_per_year,
          credit_frequency: r.credit_frequency,
          carry_forward_days: r.carry_forward_days,
          max_at_once: r.max_at_once,
          min_notice_days: r.min_notice_days,
          backdated_days: r.backdated_days,
          attachment_after_days: r.attachment_after_days,
          allowed_during_probation: r.allowed_during_probation,
          comp_off_expiry_days: r.comp_off_expiry_days,
        })),
      });
    } else {
      setEditingPolicy(null);
      // Initialize with active leave types
      setPolicyForm({
        name: '',
        pro_rata: true,
        status: 'ACTIVE',
        rules: leaveTypes.map((t) => ({
          leave_type_id: t.leave_type_id,
          days_per_year: t.code === 'CL' ? 12 : t.code === 'SL' ? 6 : t.code === 'EL' ? 15 : null,
          credit_frequency: t.code === 'CO' ? 'FROM_APPROVED_OT' : t.code === 'SL' ? 'YEARLY' : 'MONTHLY',
          carry_forward_days: t.code === 'EL' ? 30 : 0,
          max_at_once: t.code === 'CL' ? 3 : t.code === 'EL' ? 10 : t.code === 'CO' ? 2 : null,
          min_notice_days: t.code === 'EL' ? 7 : t.code === 'CL' || t.code === 'CO' ? 1 : 0,
          backdated_days: t.code === 'SL' || t.code === 'LWP' ? 7 : 0,
          attachment_after_days: t.code === 'SL' ? 2 : null,
          allowed_during_probation: t.code !== 'EL',
          comp_off_expiry_days: 90,
        })),
      });
    }
    setPolicyError('');
    setIsPolicyModalOpen(true);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setPolicyError('');
    try {
      if (editingPolicy) {
        await updatePolicyMut.mutateAsync({ id: editingPolicy.policy_id, data: policyForm });
      } else {
        await createPolicyMut.mutateAsync(policyForm);
      }
      setIsPolicyModalOpen(false);
    } catch (err: any) {
      setPolicyError(err?.message || 'Failed to save leave policy.');
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalForm) return;
    try {
      await updateGeneralMut.mutateAsync(generalForm);
      setGeneralSuccess(true);
      setTimeout(() => setGeneralSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update general settings.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarOff className="w-6 h-6 text-blue-600" />
            Leave Settings
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure Leave Types, Leave Policies, General Rules, and Audit Change Log (BFD Section 3).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('types')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'types'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Leave Types ({leaveTypes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('policies')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'policies'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Leave Policies ({leavePolicies.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'general'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            General Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('changelog')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'changelog'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Change Log
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LEAVE TYPES                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-slate-600">
              Manage paid/unpaid classifications, tracking rules, and gender applicability.
            </p>
            <button
              type="button"
              onClick={() => handleOpenTypeModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Leave Type
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Paid / Unpaid</th>
                    <th className="py-3 px-4">Tracking</th>
                    <th className="py-3 px-4">Half Day</th>
                    <th className="py-3 px-4">Applies To</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveTypes.map((type) => (
                    <tr key={type.leave_type_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full bg-${type.calendar_color}-500`}
                          />
                          {type.name}
                        </div>
                        {type.description && (
                          <p className="text-xs text-slate-400 font-normal mt-0.5 line-clamp-1">
                            {type.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                          {type.code}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {type.is_paid ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Unpaid (LOP)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs font-medium">
                        {type.balance_tracked ? 'Tracked' : 'No limit'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs font-medium">
                        {type.half_day_allowed ? 'Allowed' : 'No'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs font-medium">
                        {type.applies_to === 'ALL'
                          ? 'All Employees'
                          : type.applies_to === 'FEMALE_ONLY'
                          ? 'Female Only'
                          : 'Male Only'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleTypeMut.mutate(type.leave_type_id)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                            type.status === 'ACTIVE'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {type.status}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenTypeModal(type)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Leave Type"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete ${type.name}?`)) {
                              deleteTypeMut.mutate(type.leave_type_id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Leave Type"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LEAVE POLICIES                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-slate-600">
              Configure Leave Policies with annual allotments, accrual rules, notice, and carry-forward.
            </p>
            <button
              type="button"
              onClick={() => handleOpenPolicyModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Leave Policy
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {leavePolicies.map((policy) => (
              <div
                key={policy.policy_id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900">{policy.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                          policy.status === 'ACTIVE'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {policy.status}
                      </span>
                      {policy.pro_rata && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Pro-rata enabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {policy.employees_count || 0} active employees on this policy
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCopySourceId(policy.policy_id);
                        setCopyNewName(`${policy.name} (Copy)`);
                        setIsCopyModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Policy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenPolicyModal(policy)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Rules
                    </button>
                  </div>
                </div>

                {/* Rules Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Leave Type</th>
                        <th className="py-2.5 px-3">Days / Year</th>
                        <th className="py-2.5 px-3">Credit Accrual</th>
                        <th className="py-2.5 px-3">Carry Fwd</th>
                        <th className="py-2.5 px-3">Max at Once</th>
                        <th className="py-2.5 px-3">Min Notice</th>
                        <th className="py-2.5 px-3">Backdated</th>
                        <th className="py-2.5 px-3">Probation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(policy.rules || []).map((rule) => (
                        <tr key={rule.rule_id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="font-mono text-slate-600">{rule.leave_type_code}</span> - {rule.leave_type_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-semibold">
                            {rule.days_per_year !== null && rule.days_per_year !== undefined
                              ? `${rule.days_per_year} days`
                              : 'No limit'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {rule.credit_frequency === 'MONTHLY'
                              ? 'Monthly (1st)'
                              : rule.credit_frequency === 'YEARLY'
                              ? 'Yearly (1 Jan)'
                              : 'Approved OT'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {rule.carry_forward_days > 0 ? `Up to ${rule.carry_forward_days}` : 'No'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {rule.max_at_once ? `${rule.max_at_once} days` : 'No limit'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {rule.min_notice_days > 0 ? `${rule.min_notice_days} days` : 'None'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {rule.backdated_days > 0 ? `${rule.backdated_days} days` : 'No'}
                          </td>
                          <td className="py-2.5 px-3">
                            {rule.allowed_during_probation ? (
                              <span className="text-emerald-700 font-semibold">Allowed</span>
                            ) : (
                              <span className="text-rose-600 font-semibold">Blocked</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GENERAL SETTINGS                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'general' && generalForm && (
        <form onSubmit={handleSaveGeneral} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">General Leave Settings</h3>
              <p className="text-xs text-slate-500">Company-wide leave year, sandwich rules, and reminders (BFD Section 3 Part 3).</p>
            </div>
            {generalSuccess && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Year Cycle</label>
              <select
                value={generalForm.leave_year_start}
                onChange={(e) => setGeneralForm({ ...generalForm, leave_year_start: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="JANUARY_TO_DECEMBER">January to December (Default)</option>
                <option value="APRIL_TO_MARCH">April to March</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Count Weekly Offs & Holidays ("Sandwich Rule")</span>
                <span className="text-xs text-slate-500">When enabled, off days inside a leave period are counted as leave days.</span>
              </div>
              <input
                type="checkbox"
                checked={generalForm.count_sandwich_leave}
                onChange={(e) => setGeneralForm({ ...generalForm, count_sandwich_leave: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Approve After Leave Started</span>
                <span className="text-xs text-slate-500">Allow Admin to approve a pending request whose first day has already passed.</span>
              </div>
              <input
                type="checkbox"
                checked={generalForm.approve_after_leave_started}
                onChange={(e) => setGeneralForm({ ...generalForm, approve_after_leave_started: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pending Reminder (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={generalForm.pending_reminder_hours}
                  onChange={(e) => setGeneralForm({ ...generalForm, pending_reminder_hours: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Comp-off from OT (Hours / Day)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={generalForm.comp_off_hours_per_day}
                  onChange={(e) => setGeneralForm({ ...generalForm, comp_off_hours_per_day: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Year-end Accrual Processing</label>
              <select
                value={generalForm.year_end_processing}
                onChange={(e) => setGeneralForm({ ...generalForm, year_end_processing: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="AUTOMATIC">Automatic (Runs on 1st day of new leave year)</option>
                <option value="MANUAL">Manual (Started by Admin)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={updateGeneralMut.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save General Settings
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CHANGE LOG                                                         */}
      {/* ========================================================================= */}
      {activeTab === 'changelog' && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-600">
            Immutable audit record of all changes made to Leave Types, Policies, and Settings.
          </p>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Field</th>
                  <th className="py-3 px-4">Old Value</th>
                  <th className="py-3 px-4">New Value</th>
                  <th className="py-3 px-4">Changed By</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {changeLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-sans font-semibold text-slate-800">
                      {log.entity_type} #{log.entity_id}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{log.field_name}</td>
                    <td className="py-2.5 px-4 text-rose-600 max-w-xs truncate">{log.old_value || '—'}</td>
                    <td className="py-2.5 px-4 text-emerald-700 max-w-xs truncate">{log.new_value || '—'}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-700">{log.changed_by_name || `Admin #${log.changed_by}`}</td>
                    <td className="py-2.5 px-4 text-slate-400 font-sans">
                      {new Date(log.changed_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT LEAVE TYPE (Reference Screen 1)                         */}
      {/* ========================================================================= */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingType ? 'Edit Leave Type' : 'Add Leave Type'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTypeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {typeError && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">
                {typeError}
              </div>
            )}

            <form onSubmit={handleSaveType} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Leave Type Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Casual Leave"
                    value={typeForm.name}
                    onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code * (2-5 caps)</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="e.g. CL"
                    value={typeForm.code}
                    onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>
              </div>

              {/* Paid or Unpaid */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Paid or Unpaid *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="is_paid"
                      checked={typeForm.is_paid}
                      onChange={() => setTypeForm({ ...typeForm, is_paid: true })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Paid (Full day in Payroll)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="is_paid"
                      checked={!typeForm.is_paid}
                      onChange={() => setTypeForm({ ...typeForm, is_paid: false })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Unpaid (Loss of Pay / LOP)</span>
                  </label>
                </div>
              </div>

              {/* Balance Tracked */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Balance Tracked *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="balance_tracked"
                      checked={typeForm.balance_tracked}
                      onChange={() => setTypeForm({ ...typeForm, balance_tracked: true })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Yes, needs balance</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="balance_tracked"
                      disabled={typeForm.is_paid}
                      checked={!typeForm.balance_tracked}
                      onChange={() => setTypeForm({ ...typeForm, balance_tracked: false })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className={typeForm.is_paid ? 'text-slate-400' : ''}>
                      No limit (Unpaid only)
                    </span>
                  </label>
                </div>
              </div>

              {/* Half Day & Applies To */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Half Day Allowed *</label>
                  <select
                    value={typeForm.half_day_allowed ? 'yes' : 'no'}
                    onChange={(e) => setTypeForm({ ...typeForm, half_day_allowed: e.target.value === 'yes' })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Applies To *</label>
                  <select
                    value={typeForm.applies_to}
                    onChange={(e) => setTypeForm({ ...typeForm, applies_to: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    <option value="ALL">All employees</option>
                    <option value="FEMALE_ONLY">Female only</option>
                    <option value="MALE_ONLY">Male only</option>
                  </select>
                </div>
              </div>

              {/* Calendar Color */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Colour in Calendar</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setTypeForm({ ...typeForm, calendar_color: c.value })}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${c.bg} ${
                        typeForm.calendar_color === c.value ? 'ring-2 ring-blue-500 shadow-xs' : 'opacity-70'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  placeholder="Shown on the Apply Leave form..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTypeMut.isPending || updateTypeMut.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-xs"
                >
                  Save Leave Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT LEAVE POLICY (Reference Screen 2)                       */}
      {/* ========================================================================= */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingPolicy ? `Edit Leave Policy: ${editingPolicy.name}` : 'Create Leave Policy'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {policyError && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">
                {policyError}
              </div>
            )}

            <form onSubmit={handleSavePolicy} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Policy Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard Leave Policy"
                    value={policyForm.name}
                    onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={policyForm.pro_rata}
                      onChange={(e) => setPolicyForm({ ...policyForm, pro_rata: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Pro-rata calculation for mid-year joiners</span>
                  </label>
                </div>
              </div>

              {/* Rules Table */}
              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  Rules per Leave Type included in this Policy
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Days / Yr</th>
                        <th className="py-2 px-3">Accrual</th>
                        <th className="py-2 px-3">Carry Fwd</th>
                        <th className="py-2 px-3">Max at Once</th>
                        <th className="py-2 px-3">Notice</th>
                        <th className="py-2 px-3">Backdated</th>
                        <th className="py-2 px-3">Probation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {policyForm.rules.map((rule, idx) => {
                        const lt = leaveTypes.find((t) => t.leave_type_id === rule.leave_type_id);
                        return (
                          <tr key={rule.leave_type_id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {lt?.code} ({lt?.name})
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="365"
                                placeholder="None"
                                value={rule.days_per_year ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                  const updated = [...policyForm.rules];
                                  updated[idx].days_per_year = val;
                                  setPolicyForm({ ...policyForm, rules: updated });
                                }}
                                className="w-16 px-2 py-1 rounded border border-slate-200"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={rule.credit_frequency}
                                onChange={(e) => {
                                  const updated = [...policyForm.rules];
                                  updated[idx].credit_frequency = e.target.value;
                                  setPolicyForm({ ...policyForm, rules: updated });
                                }}
                                className="px-2 py-1 rounded border border-slate-200 bg-white"
                              >
                                <option value="MONTHLY">Monthly</option>
                                <option value="YEARLY">Yearly</option>
                                <option value="FROM_APPROVED_OT">Approved OT</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                value={rule.carry_forward_days}
                                onChange={(e) => {
                                  const updated = [...policyForm.rules];
                                  updated[idx].carry_forward_days = parseFloat(e.target.value) || 0;
                                  setPolicyForm({ ...policyForm, rules: updated });
                                }}
                                className="w-14 px-2 py-1 rounded border border-slate-200"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                placeholder="None"
                                value={rule.max_at_once ?? ''}
                                onChange={(e) => {
                                  const updated = [...policyForm.rules];
                                  updated[idx].max_at_once = e.target.value === '' ? null : parseFloat(e.target.value);
                                  setPolicyForm({ ...policyForm, rules: updated });
                                }}
                                className="w-14 px-2 py-1 rounded border border-slate-200"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                value={rule.min_notice_days}
                                onChange={(e) => {
                                  const updated = [...policyForm.rules];
                                  updated[idx].min_notice_days = parseInt(e.target.value, 10) || 0;
                                  setPolicyForm({ ...policyForm, rules: updated });
                                }}
                                className="w-14 px-2 py-1 rounded border border-slate-200"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                value={rule.backdated_days}
                                onChange={(e) => {
                                  const updated = [...policyForm.rules];
                                  updated[idx].backdated_days = parseInt(e.target.value, 10) || 0;
                                  setPolicyForm({ ...policyForm, rules: updated });
                                }}
                                className="w-14 px-2 py-1 rounded border border-slate-200"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={rule.allowed_during_probation}
                                onChange={(e) => {
                                  const updated = [...policyForm.rules];
                                  updated[idx].allowed_during_probation = e.target.checked;
                                  setPolicyForm({ ...policyForm, rules: updated });
                                }}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPolicyMut.isPending || updatePolicyMut.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-xs"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COPY POLICY                                                        */}
      {/* ========================================================================= */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 text-xs">
            <h3 className="text-base font-bold text-slate-900">Make Copy of Policy</h3>
            <p className="text-slate-500">Enter a unique name for the new cloned policy:</p>

            <input
              type="text"
              required
              value={copyNewName}
              onChange={(e) => setCopyNewName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (copySourceId && copyNewName) {
                    await copyPolicyMut.mutateAsync({ id: copySourceId, new_name: copyNewName });
                    setIsCopyModalOpen(false);
                  }
                }}
                disabled={copyPolicyMut.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-xs"
              >
                Create Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
