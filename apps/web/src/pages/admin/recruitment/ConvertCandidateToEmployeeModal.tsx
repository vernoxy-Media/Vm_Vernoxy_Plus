import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Loader2,
  AlertCircle,
  ArrowRight,
  Info,
  Check,
  Link2,
} from 'lucide-react';
import {
  CandidateItem,
  useNextEmpCodeQuery,
  useConvertCandidateToEmployeeMutation,
} from '../../../hooks/use-recruitment';

interface ConvertCandidateToEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateItem | null;
  onConverted?: (employeeId: number) => void;
}

export const ConvertCandidateToEmployeeModal: React.FC<ConvertCandidateToEmployeeModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onConverted,
}) => {
  const navigate = useNavigate();
  const { data: nextEmpData, isLoading: isLoadingNextCode } = useNextEmpCodeQuery();
  const convertMutation = useConvertCandidateToEmployeeMutation();

  const [officeEmail, setOfficeEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pre-generate recommended office email from candidate name
  useEffect(() => {
    if (candidate?.name) {
      const cleanParts = candidate.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);

      if (cleanParts.length >= 2) {
        setOfficeEmail(`${cleanParts[0]}.${cleanParts[cleanParts.length - 1]}@vernoxy.com`);
      } else if (cleanParts.length === 1) {
        setOfficeEmail(`${cleanParts[0]}@vernoxy.com`);
      } else {
        setOfficeEmail('');
      }
    }
    setError(null);
  }, [candidate]);

  if (!isOpen || !candidate) return null;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const nextCodePreview = nextEmpData?.next_emp_code || 'EMP-XXXX';
  const roleName = candidate.final_role_name || candidate.role_name || 'Designation not specified';
  const depName = candidate.final_department_name || candidate.department_name || 'Department not specified';

  const formatJoiningDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Immediately / TBD';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = officeEmail.trim();
    if (!trimmed) {
      setError('Please provide an office email.');
      return;
    }

    // Basic email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError('Please provide a valid email format.');
      return;
    }

    try {
      const res = await convertMutation.mutateAsync({
        candidateId: candidate.candidate_id,
        office_email: trimmed,
      });

      const newEmpId = res.employee?.emp_id;
      onClose();

      if (onConverted && newEmpId) {
        onConverted(newEmpId);
      } else if (newEmpId) {
        // Open Employee Details on the Documents / Onboarding tab as required by BFD Marker 5
        navigate(`/admin/employees/${newEmpId}?tab=documents`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to convert candidate to employee. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Convert Candidate to Employee</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              The candidate's details are copied into a new employee record. Nothing has to be typed again.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleConvert} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Candidate -> Target Emp Card (Marker 1) */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0 ring-4 ring-emerald-50">
              {getInitials(candidate.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 text-sm truncate">{candidate.name}</span>
                <span className="text-slate-400 text-xs">&bull;</span>
                <span className="font-mono text-xs text-slate-600 font-semibold">{candidate.candidate_code}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300/60 px-2 py-0.5 rounded-md">
                  {isLoadingNextCode ? '...' : nextCodePreview}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 truncate">
                <span>{roleName}</span>
                <span className="mx-1.5 text-slate-300">&bull;</span>
                <span>{depName}</span>
                <span className="mx-1.5 text-slate-300">&bull;</span>
                <span>Joining {formatJoiningDate(candidate.expected_joining_date)}</span>
              </div>
            </div>
          </div>

          {/* What will be copied (Marker 2) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              What will be copied
            </span>
            <div className="bg-slate-50/60 rounded-2xl border border-slate-200/80 divide-y divide-slate-100 text-xs">
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-600">Full Name, Phone, Gender, Personal Email</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Copied
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-600">Designation, Department, Reporting Manager, Employment Type</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Copied
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-600">
                  Expected Joining Date &rarr; Joining Date &bull; Offered CTC &rarr; Salary
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Copied
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-600">Resume and candidate history</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
                  <Link2 className="w-3 h-3 text-blue-600" />
                  Linked
                </span>
              </div>
            </div>
          </div>

          {/* Office Email (Marker 3) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Office Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={officeEmail}
              onChange={(e) => setOfficeEmail(e.target.value)}
              placeholder="e.g. rohan.mehta@vernoxy.com"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-medium"
            />
            <p className="text-[11px] text-slate-400">
              Company email for internal system use. Must be unique.
            </p>
          </div>

          {/* Onboarding info note (Marker 4) */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/70 text-blue-800 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <p className="leading-relaxed">
              <strong>The employee starts in Onboarding status.</strong> No login is created until the account is activated. Documents and letters can be issued from the Employee profile.
            </p>
          </div>

          {/* Footer Actions (Marker 5) */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={convertMutation.isPending}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={convertMutation.isPending || !officeEmail.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs hover:shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              {convertMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Convert to Employee</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
