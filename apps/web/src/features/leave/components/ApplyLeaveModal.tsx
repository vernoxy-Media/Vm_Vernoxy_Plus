import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UploadCloud, Paperclip, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import {
  ApplyType,
  LeaveDuration,
  LeavePreview,
  useAddLeaveForEmployeeMutation,
  useApplyLeaveMutation,
  useEmployeeLeaveSummaryQuery,
  useLeaveLookupsQuery,
  useLeavePreviewMutation,
} from '../hooks/use-leave';
import { useUploadAttachmentMutation } from '@/shared/hooks/use-attachments';
import { useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { SearchableSelect } from '@/shared/ui/SearchableSelect';
import {
  Btn,
  ConfirmModal,
  FieldError,
  Modal,
  PaidTag,
  errMessage,
  fieldErrors,
  fmtDays,
  fmtWeekday,
  todayYmd,
} from './leave-ui';

export interface ApplyLeaveHeader {
  name: string;
  emp_code: string;
  department_name: string | null;
  policy_name: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (requestNo: string) => void;
  /** Employee mode: the logged-in employee's own data. */
  header?: ApplyLeaveHeader;
  applyTypes?: ApplyType[];
  /** Admin mode ("+ Add Leave for Employee"): Employee field on top. */
  adminMode?: boolean;
  currentEmpId?: number;
}

const MAX_FILE = 5 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

export const ApplyLeaveModal: React.FC<Props> = ({
  open,
  onClose,
  onSaved,
  header,
  applyTypes = [],
  adminMode = false,
  currentEmpId,
}) => {
  const { data: lookups } = useLeaveLookupsQuery();
  const { data: employeeOptions = [], isLoading: loadingEmployees } = useEmployeeOptionsQuery();

  const [empId, setEmpId] = useState<number | null>(null);
  const { data: empSummary, isFetching: loadingEmp } = useEmployeeLeaveSummaryQuery(adminMode ? empId || undefined : undefined);

  const types: ApplyType[] = adminMode ? empSummary?.apply_types || [] : applyTypes;
  const formHeader: ApplyLeaveHeader | null = adminMode
    ? empSummary
      ? {
          name: empSummary.employee.name,
          emp_code: empSummary.employee.emp_code,
          department_name: empSummary.employee.department_name,
          policy_name: empSummary.policy_name,
        }
      : null
    : header || null;

  const [typeId, setTypeId] = useState<number | null>(null);
  const [duration, setDuration] = useState<LeaveDuration>('FULL_DAY');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const previewMut = useLeavePreviewMutation();
  const applyMut = useApplyLeaveMutation();
  const addMut = useAddLeaveForEmployeeMutation();
  const uploadMut = useUploadAttachmentMutation();
  const [preview, setPreview] = useState<LeavePreview | null>(null);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setEmpId(null);
    setTypeId(null);
    setDuration('FULL_DAY');
    setFromDate('');
    setToDate('');
    setReason('');
    setRemarks('');
    setAttachment(null);
    setUploadError('');
    setSubmitErrors({});
    setGeneralError('');
    setPreview(null);
  }, [open]);

  // Admin mode: changing employee resets the type
  useEffect(() => {
    setTypeId(null);
    setPreview(null);
  }, [empId]);

  const selectedType = types.find((t) => t.leave_type_id === typeId) || null;

  // A type without half days forces Full Day; a half day has one date.
  useEffect(() => {
    if (selectedType && !selectedType.half_day_allowed && duration !== 'FULL_DAY') setDuration('FULL_DAY');
  }, [selectedType, duration]);
  useEffect(() => {
    if (duration !== 'FULL_DAY' && fromDate) setToDate(fromDate);
  }, [duration, fromDate]);

  // Live Leave days (BFD 5.1 marker 6)
  useEffect(() => {
    if (!open || !typeId || !fromDate || !toDate || (adminMode && !empId)) {
      setPreview(null);
      return;
    }
    const t = setTimeout(() => {
      previewMut.mutate(
        {
          leave_type_id: typeId,
          from_date: fromDate,
          to_date: toDate,
          duration,
          ...(adminMode && empId ? { emp_id: empId } : {}),
        },
        {
          onSuccess: (p) => setPreview(p),
          onError: () => setPreview(null),
        },
      );
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, typeId, fromDate, toDate, duration, empId, adminMode]);

  const previewErrors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of preview?.errors || []) if (!map[e.field]) map[e.field] = e.message;
    return map;
  }, [preview]);
  const errorFor = (field: string) => submitErrors[field] || previewErrors[field];

  const durationOptions = (lookups?.leave_duration || []).filter(
    (o) => o.value === 'FULL_DAY' || selectedType?.half_day_allowed !== false,
  );

  const employeeSelectOptions = useMemo(
    () =>
      (employeeOptions as any[])
        .filter((e) => e.emp_id !== currentEmpId)
        .map((e) => ({ value: e.emp_id, label: e.name, sublabel: e.email })),
    [employeeOptions, currentEmpId],
  );

  const isDirty = Boolean(typeId || fromDate || toDate || reason || attachment || remarks || empId);
  const requestClose = () => {
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  };

  const handleFile = async (file?: File | null) => {
    setUploadError('');
    if (!file) return;
    if (!ALLOWED.includes(file.type) || !/\.(pdf|jpe?g|png)$/i.test(file.name) || file.size > MAX_FILE) {
      setUploadError('Only PDF, JPG or PNG up to 5 MB.');
      return;
    }
    try {
      const res = await uploadMut.mutateAsync({ entityType: 'LEAVE_REQUEST', entityId: 0, file });
      setAttachment({ url: res.file_url, name: file.name });
    } catch {
      setUploadError('Upload failed. Try again.');
    }
  };

  const validateLocal = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (adminMode && !empId) e.emp_id = 'Please fill this field.';
    if (!typeId) e.leave_type_id = 'Please fill this field.';
    if (!duration) e.duration = 'Please fill this field.';
    if (!fromDate) e.from_date = 'Please fill this field.';
    if (!toDate) e.to_date = 'Please fill this field.';
    const len = reason.trim().length;
    if (!len) e.reason = 'Please fill this field.';
    else if (len < 10 || len > 500) e.reason = 'Please write a reason of 10 to 500 characters.';
    if (preview?.attachment_required && !attachment) {
      e.attachment = `Please attach a medical certificate or supporting document for ${selectedType?.name} of more than ${preview.attachment_after_days} days.`;
    }
    return e;
  };

  const handleSubmit = async () => {
    setGeneralError('');
    const local = validateLocal();
    setSubmitErrors(local);
    if (Object.keys(local).length) return;
    const payload = {
      leave_type_id: typeId!,
      from_date: fromDate,
      to_date: toDate,
      duration,
      reason: reason.trim(),
      ...(attachment ? { attachment_url: attachment.url, attachment_name: attachment.name } : {}),
    };
    try {
      const res = adminMode
        ? await addMut.mutateAsync({ ...payload, emp_id: empId!, ...(remarks.trim() ? { remarks: remarks.trim() } : {}) })
        : await applyMut.mutateAsync(payload);
      onSaved?.(res.request_no);
      onClose();
    } catch (err: any) {
      const fe = fieldErrors(err);
      setSubmitErrors(fe);
      if (!Object.keys(fe).length) setGeneralError(errMessage(err, 'The request could not be submitted.'));
    }
  };

  const saving = applyMut.isPending || addMut.isPending;
  const inputCls = (bad?: string) =>
    `w-full px-3 py-2 rounded-xl border bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
      bad ? 'border-rose-300' : 'border-slate-200 focus:border-blue-400'
    }`;
  const label = (text: string, marker: number, required = true, hint?: string) => (
    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-1">
      {text}
      {required && <span className="text-rose-500">*</span>}
      <span className="sr-only">({marker})</span>
      {hint && <span className="font-normal text-slate-400">{hint}</span>}
    </label>
  );

  const availableText = !selectedType
    ? '—'
    : !selectedType.balance_tracked
      ? 'No limit'
      : `${fmtDays(preview?.available ?? selectedType.available)} days available · ${fmtDays(preview?.pending ?? selectedType.pending)} pending`;

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        width="max-w-2xl"
        title={adminMode ? 'Add Leave for Employee' : 'Apply Leave'}
        subtitle={
          formHeader
            ? [formHeader.name, formHeader.emp_code, formHeader.department_name, formHeader.policy_name].filter(Boolean).join(' · ')
            : adminMode
              ? 'Leave added here is saved as Approved at once.'
              : undefined
        }
        footer={
          <>
            <Btn onClick={requestClose}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSubmit} loading={saving} disabled={uploadMut.isPending}>
              {adminMode ? 'Add Leave' : 'Submit Request'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {generalError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{generalError}</div>
          )}

          {adminMode && (
            <div>
              {label('Employee', 0)}
              <SearchableSelect
                options={employeeSelectOptions}
                value={empId}
                onChange={(v) => setEmpId(v ? Number(v) : null)}
                placeholder={loadingEmployees ? 'Loading employees…' : 'Choose an Active employee'}
                searchPlaceholder="Search employee…"
                error={errorFor('emp_id')}
              />
              <FieldError message={errorFor('emp_id')} />
              {empId && !loadingEmp && empSummary && !empSummary.policy_id && (
                <FieldError message={`No leave policy is assigned to ${empSummary.employee.name}. Pick a policy in the Employee Profile first.`} />
              )}
            </div>
          )}

          {/* 1 Leave Type · 2 Available balance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              {label('Leave Type', 1)}
              <select
                value={typeId ?? ''}
                onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : null)}
                className={inputCls(errorFor('leave_type_id'))}
                disabled={adminMode && !empId}
              >
                <option value="">{adminMode && !empId ? 'Choose the employee first' : 'Select leave type'}</option>
                {types.map((t) => (
                  <option key={t.leave_type_id} value={t.leave_type_id}>
                    {t.name} ({t.is_paid ? 'Paid' : 'Unpaid'})
                  </option>
                ))}
              </select>
              {selectedType && (
                <div className="mt-1 flex items-center gap-1.5">
                  <PaidTag paid={selectedType.is_paid} />
                  {selectedType.description && <span className="text-[11px] text-slate-500">{selectedType.description}</span>}
                </div>
              )}
              <FieldError message={errorFor('leave_type_id')} />
            </div>
            <div>
              {label('Available balance', 2, false)}
              <div className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700">
                {availableText}
              </div>
            </div>
          </div>

          {/* 3 Duration */}
          <div>
            {label('Duration', 3)}
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {durationOptions.map((o) => (
                <label key={o.value} className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="leave-duration"
                    value={o.value}
                    checked={duration === o.value}
                    onChange={() => setDuration(o.value as LeaveDuration)}
                    className="accent-blue-600"
                  />
                  {o.label}
                </label>
              ))}
            </div>
            <FieldError message={errorFor('duration')} />
          </div>

          {/* 4 From Date · 5 To Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              {label('From Date', 4)}
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  if (!toDate || toDate < e.target.value || duration !== 'FULL_DAY') setToDate(e.target.value);
                }}
                className={inputCls(errorFor('from_date'))}
              />
              <FieldError message={errorFor('from_date')} />
            </div>
            <div>
              {label('To Date', 5)}
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                disabled={duration !== 'FULL_DAY'}
                onChange={(e) => setToDate(e.target.value)}
                className={`${inputCls(errorFor('to_date'))} disabled:bg-slate-50 disabled:text-slate-500`}
              />
              <FieldError message={errorFor('to_date')} />
            </div>
          </div>

          {/* 6 Leave days */}
          <div>
            {label('Leave days', 6, false)}
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 text-xs text-blue-900 min-h-[40px]">
              {previewMut.isPending && !preview ? (
                <span className="inline-flex items-center gap-1.5 text-blue-700">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Counting leave days…
                </span>
              ) : preview ? (
                <span>
                  <strong>{fmtDays(preview.leave_days)} days</strong>
                  {preview.days.filter((d) => d.day_count > 0).length > 0 &&
                    ` · ${preview.days.filter((d) => d.day_count > 0).map((d) => fmtWeekday(d.date)).join(', ')}.`}
                  {preview.excluded_notes.length > 0 && ` ${preview.excluded_notes.join('. ')}.`}
                  {preview.balance_tracked && preview.balance_after !== null
                    ? ` Balance after approval: ${fmtDays(preview.balance_after)} day${preview.balance_after === 1 ? '' : 's'}.`
                    : !preview.balance_tracked
                      ? ' No balance is kept for this leave type.'
                      : ''}
                </span>
              ) : (
                <span className="text-blue-700/70">Pick the leave type and dates to see the leave days.</span>
              )}
            </div>
            {(preview?.warnings || []).map((w) => (
              <p key={w.code} className="mt-1.5 flex items-start gap-1.5 text-[11px] font-medium text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {w.message}
              </p>
            ))}
          </div>

          {/* 7 Reason */}
          <div>
            {label('Reason', 7)}
            <textarea
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need this leave? (10 to 500 characters)"
              className={inputCls(errorFor('reason'))}
            />
            <div className="flex justify-between">
              <FieldError message={errorFor('reason')} />
              <span className="ml-auto mt-1 text-[10px] text-slate-400">{reason.trim().length}/500</span>
            </div>
          </div>

          {/* 8 Attachment */}
          <div>
            {label(
              'Attachment',
              8,
              Boolean(preview?.attachment_required),
              preview?.attachment_required
                ? `required for ${selectedType?.name} of more than ${preview.attachment_after_days} days · PDF, JPG, PNG · up to 5 MB`
                : `optional${selectedType?.attachment_after_days != null ? ` · required for ${selectedType?.name} of more than ${selectedType.attachment_after_days} days` : ''} · PDF, JPG, PNG · up to 5 MB`,
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {attachment ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-800">
                <span className="flex items-center gap-2 truncate">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="font-semibold truncate">{attachment.name}</span>
                </span>
                <button type="button" onClick={() => setAttachment(null)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer" title="Remove file">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-xs cursor-pointer transition-colors ${
                  dragOver ? 'border-blue-400 bg-blue-50/40' : errorFor('attachment') || uploadError ? 'border-rose-300' : 'border-slate-300 hover:border-blue-400'
                } text-slate-500`}
              >
                {uploadMut.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Uploading…
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" /> Drag a file here or click to upload
                  </>
                )}
              </div>
            )}
            <FieldError message={uploadError || errorFor('attachment')} />
          </div>

          {adminMode && (
            <div>
              {label('Remarks to the employee', 0, false, 'optional · up to 500 characters')}
              <textarea
                rows={2}
                maxLength={500}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className={inputCls()}
                placeholder="Shown to the employee and the Reporting Manager"
              />
            </div>
          )}

          {!adminMode && fromDate && fromDate < todayYmd() && selectedType && (
            <p className="text-[11px] text-slate-500">
              {selectedType.backdated_days
                ? `${selectedType.name} can start up to ${selectedType.backdated_days} days in the past.`
                : `${selectedType.name} cannot be applied for past dates.`}
            </p>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={confirmDiscard}
        title="Discard this request?"
        message="What you typed will be lost."
        confirmLabel="Discard"
        variant="danger"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
      />
    </>
  );
};
