import React, { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  AlertCircle,
  Mail,
} from 'lucide-react';
import {
  CandidateItem,
  useMarkCandidateDecisionMutation,
  MarkDecisionPayload,
} from '../../../hooks/use-recruitment';
import {
  useRoleOptionsQuery,
  useDepartmentOptionsQuery,
  useEmployeeOptionsQuery,
} from '../../../hooks/use-organization';
import { useLookupsQuery } from '../../../hooks/use-master-data';

interface CandidateDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateItem | null;
  initialDecision?: 'selected' | 'on_hold' | 'rejected';
  onSuccess?: (updated: CandidateItem) => void;
}

export const CandidateDecisionModal: React.FC<CandidateDecisionModalProps> = ({
  isOpen,
  onClose,
  candidate,
  initialDecision = 'selected',
  onSuccess,
}) => {
  if (!isOpen || !candidate) return null;

  const { data: roles = [] } = useRoleOptionsQuery();
  const { data: departments = [] } = useDepartmentOptionsQuery();
  const { data: employees = [] } = useEmployeeOptionsQuery();
  const { data: rejectionReasons = [] } = useLookupsQuery('rejection_reason');

  const markDecisionMutation = useMarkCandidateDecisionMutation();

  const [decision, setDecision] = useState<'selected' | 'on_hold' | 'rejected'>(initialDecision);

  // Selected State
  const [finalRoleId, setFinalRoleId] = useState<number>(
    candidate.final_role_id || (candidate as any).finalRoleId || candidate.role_id || (candidate as any).roleId || 0,
  );
  const [finalDepId, setFinalDepId] = useState<number>(
    candidate.final_dep_id || (candidate as any).finalDepId || candidate.dep_id || (candidate as any).depId || 0,
  );
  const [offeredCtc, setOfferedCtc] = useState<string>(
    candidate.offered_ctc !== undefined && candidate.offered_ctc !== null
      ? String(candidate.offered_ctc)
      : (candidate as any).offeredCtc !== undefined && (candidate as any).offeredCtc !== null
      ? String((candidate as any).offeredCtc)
      : candidate.expected_ctc !== undefined && candidate.expected_ctc !== null
      ? String(candidate.expected_ctc)
      : (candidate as any).expectedCtc !== undefined && (candidate as any).expectedCtc !== null
      ? String((candidate as any).expectedCtc)
      : '',
  );
  const [expectedJoiningDate, setExpectedJoiningDate] = useState<string>(() => {
    const d = candidate.expected_joining_date || (candidate as any).expectedJoiningDate;
    return d ? String(d).split('T')[0] : '';
  });
  const [reportingManagerId, setReportingManagerId] = useState<number | undefined>(
    candidate.reporting_manager_id ?? (candidate as any).reportingManagerId ?? undefined,
  );
  const [employmentType, setEmploymentType] = useState<string>(
    candidate.employment_type || (candidate as any).employmentType || 'Full-time',
  );

  // On Hold State
  const [onHoldReviewDate, setOnHoldReviewDate] = useState<string>(() => {
    const d = candidate.on_hold_review_date || (candidate as any).onHoldReviewDate;
    return d ? String(d).split('T')[0] : '';
  });
  const [onHoldNotes, setOnHoldNotes] = useState<string>(
    candidate.on_hold_notes || (candidate as any).onHoldNotes || '',
  );

  // Rejected State
  const [rejectionReason, setRejectionReason] = useState<string>(
    candidate.rejection_reason || (candidate as any).rejectionReason || (rejectionReasons[0]?.code ?? 'skills_not_matching'),
  );
  const [rejectionNotes, setRejectionNotes] = useState<string>(
    candidate.rejection_notes || (candidate as any).rejectionNotes || '',
  );
  const [sendRegretEmail, setSendRegretEmail] = useState<boolean>(
    Boolean(candidate.send_regret_email ?? (candidate as any).sendRegretEmail),
  );

  // Common Notes
  const [notes, setNotes] = useState<string>(
    candidate.decision_notes || (candidate as any).decisionNotes || '',
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset when modal opens with new candidate or initial decision
  useEffect(() => {
    if (!isOpen || !candidate) return;
    setDecision(initialDecision);
    const rId = candidate.final_role_id ?? (candidate as any).finalRoleId ?? candidate.role_id ?? (candidate as any).roleId ?? 0;
    const dId = candidate.final_dep_id ?? (candidate as any).finalDepId ?? candidate.dep_id ?? (candidate as any).depId ?? 0;
    setFinalRoleId(rId);
    setFinalDepId(dId);

    const ctc = candidate.offered_ctc ?? (candidate as any).offeredCtc ?? candidate.expected_ctc ?? (candidate as any).expectedCtc;
    setOfferedCtc(ctc !== undefined && ctc !== null ? String(ctc) : '');

    const jDate = candidate.expected_joining_date ?? (candidate as any).expectedJoiningDate;
    setExpectedJoiningDate(jDate ? String(jDate).split('T')[0] : '');

    setReportingManagerId(candidate.reporting_manager_id ?? (candidate as any).reportingManagerId ?? undefined);
    setEmploymentType(candidate.employment_type ?? (candidate as any).employmentType ?? 'Full-time');

    const revDate = candidate.on_hold_review_date ?? (candidate as any).onHoldReviewDate;
    setOnHoldReviewDate(revDate ? String(revDate).split('T')[0] : '');

    setOnHoldNotes(candidate.on_hold_notes ?? (candidate as any).onHoldNotes ?? '');
    setRejectionReason(candidate.rejection_reason ?? (candidate as any).rejectionReason ?? 'skills_not_matching');
    setRejectionNotes(candidate.rejection_notes ?? (candidate as any).rejectionNotes ?? '');
    setSendRegretEmail(Boolean(candidate.send_regret_email ?? (candidate as any).sendRegretEmail));
    setNotes(candidate.decision_notes ?? (candidate as any).decisionNotes ?? '');
    setErrors({});
  }, [isOpen, initialDecision, candidate?.candidate_id, (candidate as any)?.candidateId]);

  // Auto-sync department when role changes in modal
  const handleRoleChange = (roleIdStr: string) => {
    const rId = parseInt(roleIdStr, 10);
    setFinalRoleId(rId);
    const matched = roles.find((r: any) => r.role_id === rId);
    if (matched && matched.dep_id) {
      setFinalDepId(matched.dep_id);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (decision === 'selected') {
      if (!finalRoleId) errs.finalRoleId = 'Designation is required';
      if (!finalDepId) errs.finalDepId = 'Department is required';
      if (!expectedJoiningDate) errs.expectedJoiningDate = 'Expected joining date is required';
      if (offeredCtc && (isNaN(Number(offeredCtc)) || Number(offeredCtc) <= 0)) {
        errs.offeredCtc = 'Please enter a valid positive number for offered CTC';
      }
    } else if (decision === 'on_hold') {
      if (!onHoldNotes.trim() && !notes.trim()) {
        errs.onHoldNotes = 'Please provide notes/reason for putting on hold';
      }
    } else if (decision === 'rejected') {
      if (!rejectionReason) errs.rejectionReason = 'Please select a rejection reason';
      if (rejectionReason.toLowerCase() === 'other' && !rejectionNotes.trim() && !notes.trim()) {
        errs.rejectionNotes = 'Notes are mandatory when rejection reason is "Other"';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleConfirm = () => {
    if (!validate()) return;

    const payload: MarkDecisionPayload = {
      decision,
    };

    if (decision === 'selected') {
      payload.final_role_id = finalRoleId;
      payload.final_dep_id = finalDepId;
      payload.offered_ctc = offeredCtc ? Number(offeredCtc) : undefined;
      payload.expected_joining_date = expectedJoiningDate;
      payload.reporting_manager_id = reportingManagerId;
      payload.employment_type = employmentType;
      payload.notes = notes.trim() || undefined;
    } else if (decision === 'on_hold') {
      payload.on_hold_review_date = onHoldReviewDate || undefined;
      payload.on_hold_notes = onHoldNotes.trim() || notes.trim() || undefined;
      payload.notes = notes.trim() || undefined;
    } else if (decision === 'rejected') {
      payload.rejection_reason = rejectionReason;
      payload.rejection_notes = rejectionNotes.trim() || notes.trim() || undefined;
      payload.send_regret_email = sendRegretEmail;
      payload.notes = notes.trim() || undefined;
    }

    const cid = candidate.candidate_id ?? (candidate as any).candidateId;
    if (!cid) {
      setErrors({ submit: 'Candidate ID is missing. Please refresh and try again.' });
      return;
    }

    markDecisionMutation.mutate(
      { candidateId: cid, data: payload },
      {
        onSuccess: (updated) => {
          onSuccess?.(updated);
          onClose();
        },
        onError: (err: any) => {
          setErrors({ submit: err?.detail || err?.message || 'Failed to save decision.' });
        },
      },
    );
  };

  const selectedDepartment = departments.find((d: any) => d.dep_id === finalDepId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Mark Decision</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Candidate Banner (Reference Screen 6) */}
          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/60 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {getInitials(candidate.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 truncate text-sm">{candidate.name}</h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                  {candidate.candidate_code}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {candidate.role_name} &bull; {candidate.department_name}
              </p>
            </div>
          </div>

          {/* Decision Radio Group (Marker 1) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Decision <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Selected */}
              <button
                type="button"
                onClick={() => setDecision('selected')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  decision === 'selected'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2
                  className={`w-4 h-4 ${decision === 'selected' ? 'text-emerald-600' : 'text-slate-400'}`}
                />
                <span>Selected</span>
              </button>

              {/* On Hold */}
              <button
                type="button"
                onClick={() => setDecision('on_hold')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  decision === 'on_hold'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock
                  className={`w-4 h-4 ${decision === 'on_hold' ? 'text-amber-600' : 'text-slate-400'}`}
                />
                <span>On Hold</span>
              </button>

              {/* Rejected */}
              <button
                type="button"
                onClick={() => setDecision('rejected')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  decision === 'rejected'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 shadow-xs ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle
                  className={`w-4 h-4 ${decision === 'rejected' ? 'text-rose-600' : 'text-slate-400'}`}
                />
                <span>Rejected</span>
              </button>
            </div>
          </div>

          {/* Conditional Decision Form Fields */}
          {decision === 'selected' && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Final Designation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Final Designation <span className="text-rose-500">*</span></span>
                  </label>
                  <select
                    value={finalRoleId}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium text-slate-800"
                  >
                    {roles.map((r: any) => (
                      <option key={r.role_id} value={r.role_id}>
                        {r.role_name}
                      </option>
                    ))}
                  </select>
                  {errors.finalRoleId && (
                    <p className="text-xs text-rose-500 mt-1">{errors.finalRoleId}</p>
                  )}
                </div>

                {/* Department(s) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Department(s) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={selectedDepartment?.name || 'Department auto-selected'}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-100/80 text-slate-600 font-medium cursor-not-allowed"
                  />
                  {errors.finalDepId && (
                    <p className="text-xs text-rose-500 mt-1">{errors.finalDepId}</p>
                  )}
                </div>

                {/* Offered CTC */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Offered CTC (yearly ₹)
                  </label>
                  <input
                    type="number"
                    value={offeredCtc}
                    onChange={(e) => setOfferedCtc(e.target.value)}
                    placeholder="e.g. 600000"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                  {errors.offeredCtc && (
                    <p className="text-xs text-rose-500 mt-1">{errors.offeredCtc}</p>
                  )}
                </div>

                {/* Expected Joining Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Expected Joining Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={expectedJoiningDate}
                    onChange={(e) => setExpectedJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                  {errors.expectedJoiningDate && (
                    <p className="text-xs text-rose-500 mt-1">{errors.expectedJoiningDate}</p>
                  )}
                </div>

                {/* Reporting Manager */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Reporting Manager
                  </label>
                  <select
                    value={reportingManagerId !== undefined ? String(reportingManagerId) : ''}
                    onChange={(e) =>
                      setReportingManagerId(
                        e.target.value ? parseInt(e.target.value, 10) : undefined,
                      )
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-800"
                  >
                    <option value="">Select Reporting Manager (Optional)</option>
                    {employees.map((emp: any) => (
                      <option key={emp.emp_id} value={emp.emp_id}>
                        {emp.name} (EMP-{String(emp.emp_id).padStart(4, '0')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employment Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Employment Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium text-slate-800"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Selection Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Final round cleared with Director. Strong communication and analytical skills."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white resize-none"
                />
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Confirming this will move the candidate stage to <strong>Selected</strong> and
                  unlock the <strong>"Convert to Employee"</strong> onboarding action.
                </span>
              </div>
            </div>
          )}

          {decision === 'on_hold' && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-150">
              {/* Optional Review on date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Review On Date (Optional)</span>
                </label>
                <input
                  type="date"
                  value={onHoldReviewDate}
                  onChange={(e) => setOnHoldReviewDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  On this date, the recruiting team will receive a reminder to follow up.
                </p>
              </div>

              {/* On Hold Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Hold Reason & Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={onHoldNotes}
                  onChange={(e) => setOnHoldNotes(e.target.value)}
                  placeholder="e.g. Awaiting budget approval for Q2 hiring pipeline, profile is on hold till next week."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white resize-none"
                />
                {errors.onHoldNotes && (
                  <p className="text-xs text-rose-500 mt-1">{errors.onHoldNotes}</p>
                )}
              </div>
            </div>
          )}

          {decision === 'rejected' && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-150">
              {/* Rejection Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium text-slate-800"
                >
                  {rejectionReasons.length > 0 ? (
                    rejectionReasons.map((r: any) => (
                      <option key={r.code} value={r.code}>
                        {r.label}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="skills_not_matching">Skills not matching</option>
                      <option value="salary_mismatch">Salary mismatch</option>
                      <option value="candidate_withdrew">Candidate withdrew</option>
                      <option value="no_show">No-show</option>
                      <option value="position_closed">Position closed</option>
                      <option value="other">Other</option>
                    </>
                  )}
                </select>
                {errors.rejectionReason && (
                  <p className="text-xs text-rose-500 mt-1">{errors.rejectionReason}</p>
                )}
              </div>

              {/* Rejection Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>
                    Rejection Notes {rejectionReason.toLowerCase() === 'other' && <span className="text-rose-500">*</span>}
                  </span>
                  {rejectionReason.toLowerCase() === 'other' && (
                    <span className="text-[11px] text-amber-600 font-medium">Mandatory for "Other"</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Detail feedback or internal justification for rejection..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white resize-none"
                />
                {errors.rejectionNotes && (
                  <p className="text-xs text-rose-500 mt-1">{errors.rejectionNotes}</p>
                )}
              </div>

              {/* Send regret email checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={sendRegretEmail}
                  onChange={(e) => setSendRegretEmail(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" /> Send polite regret email
                  </span>
                  <p className="text-slate-500 mt-0.5">
                    Candidate will be sent a respectful rejection notification email.
                  </p>
                </div>
              </label>
            </div>
          )}

          {errors.submit && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errors.submit}</span>
            </div>
          )}
        </div>

        {/* Footer Actions (Marker 7) */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            disabled={markDecisionMutation.isPending}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={markDecisionMutation.isPending}
            className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50 ${
              decision === 'selected'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : decision === 'on_hold'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {markDecisionMutation.isPending && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            )}
            <span>
              {decision === 'selected'
                ? 'Confirm Selection'
                : decision === 'on_hold'
                ? 'Confirm On Hold'
                : 'Confirm Rejection'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
