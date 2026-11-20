import React, { useState } from 'react';
import { Tag, Plus, Edit2, Trash2, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import type { AttendanceStatus } from '../../types/attendance.types';
import { useDeleteAttendanceStatusMutation } from '../../hooks/use-attendance-settings';
import { StatusModal } from './StatusModal';

export interface AttendanceStatusesCardProps {
  statuses: AttendanceStatus[];
}

const COLOR_MAP: Record<string, { bg: string; text: string; badge: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', badge: 'bg-rose-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', badge: 'bg-teal-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-500' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', badge: 'bg-indigo-500' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-700', badge: 'bg-slate-500' },
};

export const AttendanceStatusesCard: React.FC<AttendanceStatusesCardProps> = ({ statuses = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<AttendanceStatus | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const deleteMutation = useDeleteAttendanceStatusMutation();

  const handleOpenCreate = () => {
    setEditingStatus(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (st: AttendanceStatus) => {
    setEditingStatus(st);
    setIsModalOpen(true);
  };

  const handleDelete = async (st: AttendanceStatus) => {
    if (st.is_system) {
      alert('System attendance statuses cannot be deleted as they are required for core attendance evaluation.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete status "${st.label}"?`)) {
      try {
        await deleteMutation.mutateAsync(st.status_id);
        setSuccessMsg(`Status "${st.label}" was successfully removed.`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err: any) {
        alert(err?.message || 'Failed to delete status.');
      }
    }
  };

  return (
    <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[17px] font-bold tracking-tight text-slate-900">Attendance Status Codes & Labels</h3>
            <p className="text-xs text-slate-500">
              Manage system evaluation statuses (Present, Half Day, Absent, etc.) and custom operational tags.
            </p>
          </div>
        </div>

        <button
          type="button"
          id="add-attendance-status-button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-[13px] font-semibold shadow-md shadow-blue-600/25 active:scale-[0.98] cursor-pointer transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Status</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Statuses Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs" id="attendance-statuses-table">
          <thead className="bg-slate-50/95 backdrop-blur border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-5">Status & Short Code</th>
              <th className="py-3 px-5">System Key</th>
              <th className="py-3 px-5">Color Badge</th>
              <th className="py-3 px-5">Type</th>
              <th className="py-3 px-5">State</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {statuses.map((st) => {
              const theme = COLOR_MAP[st.color] || COLOR_MAP.blue;
              return (
                <tr key={st.status_id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 font-bold text-xs text-slate-800">
                        {st.short_code}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 block">{st.label}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-5">
                    <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {st.code}
                    </span>
                  </td>

                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${theme.bg} ${theme.text}`}>
                      <span className={`w-2 h-2 rounded-full ${theme.badge}`} />
                      {st.color}
                    </span>
                  </td>

                  <td className="py-3.5 px-5">
                    {st.is_system ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        <ShieldCheck className="w-3 h-3 text-slate-500" />
                        System Core
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        Custom Tag
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-5">
                    <span className={`text-[11px] font-semibold ${st.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {st.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        id={`edit-status-${st.status_id}`}
                        onClick={() => handleOpenEdit(st)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      {!st.is_system && (
                        <button
                          type="button"
                          id={`delete-status-${st.status_id}`}
                          onClick={() => handleDelete(st)}
                          disabled={deleteMutation.isPending}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <StatusModal
        status={editingStatus}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStatus(null);
        }}
      />
    </div>
  );
};
