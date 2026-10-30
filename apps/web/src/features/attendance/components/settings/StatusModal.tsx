import React, { useState, useEffect } from 'react';
import { X, Tag, Loader2, AlertCircle } from 'lucide-react';
import type { AttendanceStatus } from '../../types/attendance.types';
import {
  useCreateAttendanceStatusMutation,
  useUpdateAttendanceStatusMutation,
} from '../../hooks/use-attendance-settings';

export interface StatusModalProps {
  status: AttendanceStatus | null;
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { id: 'emerald', label: 'Emerald Green', bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-300' },
  { id: 'blue', label: 'Sky Blue', bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-300' },
  { id: 'amber', label: 'Amber Yellow', bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-300' },
  { id: 'rose', label: 'Rose Red', bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-300' },
  { id: 'purple', label: 'Royal Purple', bg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-300' },
  { id: 'teal', label: 'Teal Cyan', bg: 'bg-teal-500', text: 'text-teal-700', border: 'border-teal-300' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-300' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', text: 'text-indigo-700', border: 'border-indigo-300' },
  { id: 'slate', label: 'Slate Gray', bg: 'bg-slate-500', text: 'text-slate-700', border: 'border-slate-300' },
];

export const StatusModal: React.FC<StatusModalProps> = ({ status, isOpen, onClose }) => {
  const isEditing = Boolean(status);

  const [label, setLabel] = useState(status?.label || '');
  const [code, setCode] = useState(status?.code || '');
  const [shortCode, setShortCode] = useState(status?.short_code || '');
  const [color, setColor] = useState(status?.color || 'blue');
  const [isActive, setIsActive] = useState(status?.is_active ?? true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useCreateAttendanceStatusMutation();
  const updateMutation = useUpdateAttendanceStatusMutation();

  useEffect(() => {
    if (status) {
      setLabel(status.label);
      setCode(status.code);
      setShortCode(status.short_code);
      setColor(status.color);
      setIsActive(status.is_active);
    } else {
      setLabel('');
      setCode('');
      setShortCode('');
      setColor('blue');
      setIsActive(true);
    }
    setErrorMsg(null);
  }, [status, isOpen]);

  if (!isOpen) return null;

  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!isEditing && !code) {
      const autoCode = val.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      setCode(autoCode);
    }
    if (!isEditing && !shortCode) {
      setShortCode(val.slice(0, 3).toUpperCase());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setErrorMsg('Status label is required.');
      return;
    }

    try {
      if (isEditing && status) {
        await updateMutation.mutateAsync({
          id: status.status_id,
          status: {
            label: label.trim(),
            short_code: shortCode.trim().toUpperCase() || label.slice(0, 2).toUpperCase(),
            color,
            is_active: isActive,
          },
        });
      } else {
        await createMutation.mutateAsync({
          label: label.trim(),
          code: code.trim() || label.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          short_code: shortCode.trim().toUpperCase() || label.slice(0, 2).toUpperCase(),
          color,
          is_active: isActive,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save attendance status.');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? `Edit Status · ${status?.label}` : 'Add Attendance Status'}
              </h3>
              <p className="text-xs text-slate-500">
                Define a custom status option for attendance recording and reporting.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Badge */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Live Status Preview:</span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-200 font-bold text-[11px] text-slate-800">
                {shortCode || 'ST'}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white ${
                COLOR_PRESETS.find(c => c.id === color)?.bg || 'bg-blue-500'
              }`}>
                {label || 'Sample Status'}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="status-label-input" className="block text-xs font-bold text-slate-700 mb-1">
              Status Label / Name *
            </label>
            <input
              type="text"
              id="status-label-input"
              placeholder="e.g. Client Visit, Work From Home"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="status-code-input" className="block text-xs font-bold text-slate-700 mb-1">
                System Code *
              </label>
              <input
                type="text"
                id="status-code-input"
                placeholder="e.g. client_visit"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isEditing && Boolean(status?.is_system)}
                required
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-slate-800 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label htmlFor="status-short-code-input" className="block text-xs font-bold text-slate-700 mb-1">
                Short Code (1-4 chars) *
              </label>
              <input
                type="text"
                id="status-short-code-input"
                placeholder="e.g. CV, WFH"
                maxLength={5}
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                required
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-bold uppercase text-slate-800"
              />
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Color Theme Pill
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PRESETS.map((c) => {
                const isSelected = color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${c.bg} shrink-0`} />
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Status */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Status is Active (available for timesheet entries)</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-status-button"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Create Status'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
