import React, { useState } from 'react';
import {
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Loader2,
  Clock,
  History,
  ShieldAlert,
  Save,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import {
  useComplaintTypesQuery,
  useCreateComplaintTypeMutation,
  useUpdateComplaintTypeMutation,
  useToggleComplaintTypeStatusMutation,
  useDeleteComplaintTypeMutation,
  useComplaintSettingsQuery,
  useUpdateComplaintSettingsMutation,
  useComplaintChangeLogQuery,
  ComplaintTypeItem,
  ComplaintPriority,
} from '@/features/complaint/hooks/use-complaint-settings';
import {
  useDepartmentOptionsQuery,
  useEmployeeOptionsQuery,
} from '@/features/organization/hooks/use-organization';

export const SettingsComplaintSettingsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'types' | 'rules' | 'change_log'>('types');

  // Master queries
  const { data: types = [], isLoading: isLoadingTypes } = useComplaintTypesQuery(true);
  const { data: settings } = useComplaintSettingsQuery();
  const { data: changeLog = [], isLoading: isLoadingLogs } = useComplaintChangeLogQuery();
  const { data: deptOptions = [] } = useDepartmentOptionsQuery();
  const { data: empOptions = [] } = useEmployeeOptionsQuery();

  // Mutations
  const createTypeMut = useCreateComplaintTypeMutation();
  const updateTypeMut = useUpdateComplaintTypeMutation();
  const toggleStatusMut = useToggleComplaintTypeStatusMutation();
  const deleteTypeMut = useDeleteComplaintTypeMutation();
  const updateSettingsMut = useUpdateComplaintSettingsMutation();

  // Type Modal State
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ComplaintTypeItem | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [typeDescription, setTypeDescription] = useState('');
  const [defaultHandlerId, setDefaultHandlerId] = useState<number | undefined>(undefined);
  const [defaultDepartmentId, setDefaultDepartmentId] = useState<number | undefined>(undefined);
  const [defaultPriority, setDefaultPriority] = useState<ComplaintPriority>('Medium');
  const [isAlwaysConfidential, setIsAlwaysConfidential] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [typeModalError, setTypeModalError] = useState('');

  // Rules Form State
  const [targetDaysLow, setTargetDaysLow] = useState<number>(15);
  const [targetDaysMedium, setTargetDaysMedium] = useState<number>(7);
  const [targetDaysHigh, setTargetDaysHigh] = useState<number>(3);
  const [targetDaysUrgent, setTargetDaysUrgent] = useState<number>(1);
  const [confirmationWindowDays, setConfirmationWindowDays] = useState<number>(7);
  const [reminderBeforeTargetDays, setReminderBeforeTargetDays] = useState<number>(1);
  const [reviewReminderHours, setReviewReminderHours] = useState<number>(24);
  const [oldDateWarningDays, setOldDateWarningDays] = useState<number>(90);
  const [duplicateWarning, setDuplicateWarning] = useState<boolean>(true);
  const [rulesSuccess, setRulesSuccess] = useState(false);
  const [rulesError, setRulesError] = useState('');

  // Populate rules form once settings loaded
  React.useEffect(() => {
    if (settings) {
      setTargetDaysLow(settings.target_days_low);
      setTargetDaysMedium(settings.target_days_medium);
      setTargetDaysHigh(settings.target_days_high);
      setTargetDaysUrgent(settings.target_days_urgent);
      setConfirmationWindowDays(settings.confirmation_window_days);
      setReminderBeforeTargetDays(settings.reminder_before_target_days);
      setReviewReminderHours(settings.review_reminder_hours);
      setOldDateWarningDays(settings.old_date_warning_days);
      setDuplicateWarning(settings.duplicate_warning);
    }
  }, [settings]);

  const openAddTypeModal = () => {
    setEditingType(null);
    setTypeName('');
    setTypeCode('');
    setTypeDescription('');
    setDefaultHandlerId(undefined);
    setDefaultDepartmentId(undefined);
    setDefaultPriority('Medium');
    setIsAlwaysConfidential(false);
    setDisplayOrder((types.length || 0) + 1);
    setIsActive(true);
    setTypeModalError('');
    setIsTypeModalOpen(true);
  };

  const openEditTypeModal = (t: ComplaintTypeItem) => {
    setEditingType(t);
    setTypeName(t.name);
    setTypeCode(t.code);
    setTypeDescription(t.description);
    setDefaultHandlerId(t.default_handler_id || undefined);
    setDefaultDepartmentId(t.default_department_id || undefined);
    setDefaultPriority(t.default_priority);
    setIsAlwaysConfidential(t.is_always_confidential);
    setDisplayOrder(t.display_order);
    setIsActive(t.is_active);
    setTypeModalError('');
    setIsTypeModalOpen(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setTypeModalError('');

    if (!typeName.trim()) {
      setTypeModalError('Complaint type name is required.');
      return;
    }
    if (!typeDescription.trim()) {
      setTypeModalError('Description is required.');
      return;
    }

    try {
      if (editingType) {
        await updateTypeMut.mutateAsync({
          id: editingType.type_id,
          data: {
            name: typeName.trim(),
            code: typeCode.trim().toUpperCase() || undefined,
            description: typeDescription.trim(),
            default_handler_id: defaultHandlerId || null,
            default_department_id: defaultDepartmentId || null,
            default_priority: defaultPriority,
            is_always_confidential: isAlwaysConfidential,
            display_order: displayOrder,
            is_active: isActive,
          },
        });
      } else {
        await createTypeMut.mutateAsync({
          name: typeName.trim(),
          code: typeCode.trim().toUpperCase() || undefined,
          description: typeDescription.trim(),
          default_handler_id: defaultHandlerId || null,
          default_department_id: defaultDepartmentId || null,
          default_priority: defaultPriority,
          is_always_confidential: isAlwaysConfidential,
          display_order: displayOrder,
          is_active: isActive,
        });
      }
      setIsTypeModalOpen(false);
    } catch (err: any) {
      setTypeModalError(err.message || 'Failed to save complaint type.');
    }
  };

  const handleDeleteType = async (t: ComplaintTypeItem) => {
    if (t.complaints_count > 0) {
      alert(`Cannot delete "${t.name}" because it has ${t.complaints_count} complaint(s). You can switch it off instead.`);
      return;
    }
    if (confirm(`Are you sure you want to delete complaint type "${t.name}"?`)) {
      try {
        await deleteTypeMut.mutateAsync(t.type_id);
      } catch (err: any) {
        alert(err.message || 'Failed to delete complaint type.');
      }
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setRulesSuccess(false);
    setRulesError('');

    try {
      await updateSettingsMut.mutateAsync({
        target_days_low: targetDaysLow,
        target_days_medium: targetDaysMedium,
        target_days_high: targetDaysHigh,
        target_days_urgent: targetDaysUrgent,
        confirmation_window_days: confirmationWindowDays,
        reminder_before_target_days: reminderBeforeTargetDays,
        review_reminder_hours: reviewReminderHours,
        old_date_warning_days: oldDateWarningDays,
        duplicate_warning: duplicateWarning,
      });
      setRulesSuccess(true);
      setTimeout(() => setRulesSuccess(false), 3000);
    } catch (err: any) {
      setRulesError(err.message || 'Failed to save general complaint rules.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('types')}
          className={`pb-3 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'types'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Complaint Types (Master Data)
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
            {types.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          General Rules & SLAs
        </button>

        <button
          onClick={() => setActiveTab('change_log')}
          className={`pb-3 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'change_log'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Settings Change Log
        </button>
      </div>

      {/* =========================================================================
          TAB 1: COMPLAINT TYPES (MASTER DATA CRUD)
         ========================================================================= */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Configure complaint types, default handlers, default priorities, and confidentiality policies.
            </p>
            <button
              onClick={openAddTypeModal}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Complaint Type
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {isLoadingTypes ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="text-xs">Loading complaint types...</p>
              </div>
            ) : types.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No complaint types found</p>
                <p className="text-xs text-slate-500 mt-1">Click "Add Complaint Type" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Order</th>
                      <th className="py-3 px-4">Name & Code</th>
                      <th className="py-3 px-4">Covers / Description</th>
                      <th className="py-3 px-4">Default Handler</th>
                      <th className="py-3 px-4">Default Dept</th>
                      <th className="py-3 px-4">Default Priority</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {types.map((t) => (
                      <tr key={t.type_id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                          {t.display_order}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {t.name}
                            {t.is_always_confidential && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-0.5"
                                title="Always Confidential"
                              >
                                <Lock className="w-2.5 h-2.5" /> Confidential
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">{t.code}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs">{t.description}</td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {t.default_handler_name || 'Admin'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{t.default_department_name || '—'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              t.default_priority === 'Urgent'
                                ? 'bg-rose-100 text-rose-800'
                                : t.default_priority === 'High'
                                ? 'bg-amber-100 text-amber-800'
                                : t.default_priority === 'Medium'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.default_priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleStatusMut.mutate(t.type_id)}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                              t.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {t.is_active ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditTypeModal(t)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                              title="Edit type"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteType(t)}
                              className={`p-1.5 rounded transition cursor-pointer ${
                                t.complaints_count > 0
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={
                                t.complaints_count > 0
                                  ? `In use by ${t.complaints_count} complaint(s) — switch off instead`
                                  : 'Delete type'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: GENERAL RULES & SLAS (BFD Page 29)
         ========================================================================= */}
      {activeTab === 'rules' && (
        <form onSubmit={handleSaveRules} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 max-w-3xl">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Module SLA & Lifecycle Settings</h3>
            <p className="text-xs text-slate-500 mt-1">
              Changes apply to complaints submitted after saving. Every change is logged with who, when, old value, and new value.
            </p>
          </div>

          {rulesSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Settings updated successfully. Changes recorded in the Change Log.
            </div>
          )}

          {rulesError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              {rulesError}
            </div>
          )}

          {/* Section 1: Target Days by Priority */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Target Resolution Days by Priority (Calendar Days)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Low Priority</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={targetDaysLow}
                    onChange={(e) => setTargetDaysLow(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-slate-400">days</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Medium Priority</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={targetDaysMedium}
                    onChange={(e) => setTargetDaysMedium(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-slate-400">days</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">High Priority</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={targetDaysHigh}
                    onChange={(e) => setTargetDaysHigh(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-slate-400">days</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Urgent Priority</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={targetDaysUrgent}
                    onChange={(e) => setTargetDaysUrgent(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-slate-400">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Confirmation & Reminders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmation Window</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={confirmationWindowDays}
                  onChange={(e) => setConfirmationWindowDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400">days</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Days after Resolved to confirm or reopen (default: 7 days).</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reminder Before Target</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={reminderBeforeTargetDays}
                  onChange={(e) => setReminderBeforeTargetDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400">days</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Days before Target Date when handler is reminded (default: 1 day).</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Review Reminder</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={reviewReminderHours}
                  onChange={(e) => setReviewReminderHours(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400">hours</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Hours a complaint may stay New before Admin is reminded (default: 24h).</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Old Date Warning Threshold</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={oldDateWarningDays}
                  onChange={(e) => setOldDateWarningDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400">days</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Days after which complaint date shows warning (default: 90 days).</p>
            </div>
          </div>

          {/* Section 3: Duplicate Warning */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-800">Duplicate Submission Warning</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Warn employees if they submit a complaint of the same type and department within 7 days.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={duplicateWarning}
                onChange={(e) => setDuplicateWarning(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={updateSettingsMut.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save SLA Settings
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 3: SETTINGS CHANGE LOG (BFD Page 29)
         ========================================================================= */}
      {activeTab === 'change_log' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Module Configuration Change Log</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Audit trail of every rule modification with who, when, old value, and new value.
            </p>
          </div>

          {isLoadingLogs ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-xs">Loading change log...</p>
            </div>
          ) : changeLog.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No settings changes logged yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Field Changed</th>
                    <th className="py-3 px-4">Old Value</th>
                    <th className="py-3 px-4">New Value</th>
                    <th className="py-3 px-4">Changed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {changeLog.map((log) => (
                    <tr key={log.log_id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(log.changed_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{log.field_name}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono line-through">{log.old_value || 'None'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">{log.new_value}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{log.changed_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TYPE MODAL (ADD / EDIT)
         ========================================================================= */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                {editingType ? 'Edit Complaint Type' : 'Add Complaint Type'}
              </h3>
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="p-5 space-y-4">
              {typeModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                  {typeModalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Complaint Type Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Workplace & Facilities"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Code (Auto-generated if left blank)
                </label>
                <input
                  type="text"
                  placeholder="e.g. WORKPLACE_FACILITIES"
                  value={typeCode}
                  onChange={(e) => setTypeCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  One-Line Description / Hint *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Cleanliness, seating, air conditioning, water, transport, parking"
                  value={typeDescription}
                  onChange={(e) => setTypeDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Shown to employees under the dropdown in the Add Complaint form.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Priority *</label>
                  <select
                    value={defaultPriority}
                    onChange={(e) => setDefaultPriority(e.target.value as ComplaintPriority)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="Low">Low (15 days)</option>
                    <option value="Medium">Medium (7 days)</option>
                    <option value="High">High (3 days)</option>
                    <option value="Urgent">Urgent (1 day)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    min={1}
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Handler</label>
                  <select
                    value={defaultHandlerId || ''}
                    onChange={(e) => setDefaultHandlerId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="">None (Admin)</option>
                    {empOptions.map((emp: any) => (
                      <option key={emp.emp_id || emp.id} value={emp.emp_id || emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Department</label>
                  <select
                    value={defaultDepartmentId || ''}
                    onChange={(e) => setDefaultDepartmentId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="">None</option>
                    {deptOptions.map((d: any) => (
                      <option key={d.dep_id || d.id} value={d.dep_id || d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAlwaysConfidential}
                    onChange={(e) => setIsAlwaysConfidential(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-700">Always Confidential (e.g. Behaviour & Conduct)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-700">Active</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTypeMut.isPending || updateTypeMut.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {(createTypeMut.isPending || updateTypeMut.isPending) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {editingType ? 'Update Type' : 'Create Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
