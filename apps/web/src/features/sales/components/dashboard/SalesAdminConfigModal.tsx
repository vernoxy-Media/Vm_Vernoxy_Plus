import React, { useState } from 'react';
import { X, Save, RotateCcw, Sliders, Check } from 'lucide-react';
import {
  useUpdateDashboardDefaults,
  useListDashboardUserPermissions,
  useUpdateUserChartPermissions,
} from '../../hooks/useSalesDashboard';

interface SalesAdminConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDefaults: any;
  users: Array<{ emp_id: number; name: string }>;
}

const ALL_CHARTS = [
  { key: 'us02', label: 'Lead Status Overview (Donut Chart)' },
  { key: 'us03', label: 'New Leads Added Trend (Area Chart)' },
  { key: 'us04', label: 'Lead-to-Client Conversion Trend (Column Chart)' },
  { key: 'us05', label: 'Lead Source Performance (Horizontal Bar Chart)' },
  { key: 'us06', label: 'Service Fit Demand (Dumbbell Chart)' },
  { key: 'us07', label: 'Lead Owner Performance (Heatmap)' },
  { key: 'us08', label: 'Lead Conversion Cycle Time (Bar Chart)' },
  { key: 'us09', label: 'Conversation Activity Trend (Line Chart)' },
  { key: 'us10', label: 'Revenue Generated (Waterfall Chart)' },
  { key: 'us11', label: 'Sales Profitability (Combo Chart)' },
  { key: 'us12_calls', label: 'Calls Made Counter' },
  { key: 'us12_emails', label: 'Emails Sent Counter' },
  { key: 'us12_today_fu', label: "Today's Follow-ups Counter" },
  { key: 'us12_total_fu', label: 'Total Follow-ups Done Counter' },
  { key: 'us12_duration', label: 'Average Call Duration Counter' },
  { key: 'us12_unanswered', label: 'Unanswered / Unsuccessful Calls Counter' },
  { key: 'us12_leads', label: 'Total Leads Counter' },
  { key: 'us12_companies', label: 'Total Companies Counter' },
];

export const SalesAdminConfigModal: React.FC<SalesAdminConfigModalProps> = ({
  isOpen,
  onClose,
  currentDefaults,
  users,
}) => {
  const [activeTab, setActiveTab] = useState<'defaults' | 'permissions'>('defaults');
  const [defaults, setDefaults] = useState({
    date_range: currentDefaults?.date_range || 'this_month',
    lead_source: currentDefaults?.lead_source || [],
    lead_by: currentDefaults?.lead_by || 'all',
    service_fit: currentDefaults?.service_fit || [],
    status: currentDefaults?.status || [],
    city: currentDefaults?.city || [],
    industry_ids: currentDefaults?.industry_ids || [],
  });

  const { data: userPermsList } = useListDashboardUserPermissions();
  const [selectedUserEmpId, setSelectedUserEmpId] = useState<number | null>(null);
  const [userPermsMap, setUserPermsMap] = useState<Record<string, boolean>>({});

  const updateDefaultsMutation = useUpdateDashboardDefaults();
  const updatePermsMutation = useUpdateUserChartPermissions();

  if (!isOpen) return null;

  const handleSelectUser = (empId: number) => {
    setSelectedUserEmpId(empId);
    const found = userPermsList?.find((u) => u.emp_id === empId);
    if (found) {
      setUserPermsMap({ ...found.permissions });
    } else {
      const all: Record<string, boolean> = {};
      ALL_CHARTS.forEach((c) => (all[c.key] = true));
      setUserPermsMap(all);
    }
  };

  const handleTogglePerm = (key: string) => {
    setUserPermsMap((prev) => ({
      ...prev,
      [key]: prev[key] === false ? true : false,
    }));
  };

  const handleSaveDefaults = () => {
    updateDefaultsMutation.mutate(defaults, {
      onSuccess: () => alert('Default filters saved successfully!'),
    });
  };

  const handleSavePermissions = () => {
    if (!selectedUserEmpId) return;
    updatePermsMutation.mutate(
      { empId: selectedUserEmpId, permissions: userPermsMap },
      {
        onSuccess: () => alert('Chart access permissions saved successfully!'),
      }
    );
  };

  const handleResetDefaults = () => {
    setDefaults({
      date_range: 'this_month',
      lead_source: [],
      lead_by: 'all',
      service_fit: [],
      status: [],
      city: [],
      industry_ids: [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Sliders className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Admin Dashboard Configuration</h2>
              <p className="text-xs text-slate-500">Configure global defaults and individual chart access permissions</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="my-4 flex border-b border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('defaults')}
            className={`border-b-2 px-4 py-2 transition cursor-pointer ${
              activeTab === 'defaults' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            A. Default Global Filters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`border-b-2 px-4 py-2 transition cursor-pointer ${
              activeTab === 'permissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            B. Chart Access Management
          </button>
        </div>

        {activeTab === 'defaults' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Date Range</label>
                <select
                  value={defaults.date_range}
                  onChange={(e) => setDefaults({ ...defaults, date_range: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800"
                >
                  <option value="this_month">This Month (System Default)</option>
                  <option value="all_time">All Time</option>
                  <option value="today">Today</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="last_6_months">Last 6 Months</option>
                  <option value="this_year">This Year</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Lead By</label>
                <select
                  value={defaults.lead_by}
                  onChange={(e) => setDefaults({ ...defaults, lead_by: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800"
                >
                  <option value="all">All (System Default)</option>
                  {users.map((u) => (
                    <option key={u.emp_id} value={String(u.emp_id)}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset to System Defaults</span>
              </button>
              <button
                type="button"
                onClick={handleSaveDefaults}
                disabled={updateDefaultsMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Defaults</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Active User</label>
              <select
                value={selectedUserEmpId || ''}
                onChange={(e) => handleSelectUser(Number(e.target.value))}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800"
              >
                <option value="">-- Choose User --</option>
                {userPermsList?.map((u) => (
                  <option key={u.emp_id} value={u.emp_id}>
                    {u.name} {u.is_admin ? '(Admin - Full Access)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedUserEmpId && (
              <div className="max-h-60 overflow-y-auto space-y-2 rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                {ALL_CHARTS.map((chart) => {
                  const enabled = userPermsMap[chart.key] !== false;
                  return (
                    <div key={chart.key} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                      <span className="text-xs font-medium text-slate-700">{chart.label}</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePerm(chart.key)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition ${
                          enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>{enabled ? 'Enabled' : 'Disabled'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end border-t border-slate-100 pt-4 mt-6">
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={!selectedUserEmpId || updatePermsMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save User Permissions</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
