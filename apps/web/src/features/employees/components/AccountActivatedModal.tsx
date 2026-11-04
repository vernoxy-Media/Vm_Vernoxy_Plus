import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, ShieldCheck, X } from 'lucide-react';
import { ActivateEmployeeResult } from '../hooks/use-employee-documents';

interface AccountActivatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ActivateEmployeeResult | null;
  employeeName?: string;
  title?: string;
  description?: string;
}

export const AccountActivatedModal: React.FC<AccountActivatedModalProps> = ({
  isOpen,
  onClose,
  result,
  employeeName,
  title,
  description,
}) => {
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  if (!isOpen || !result) return null;

  const handleCopyEmail = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 text-center border-b border-slate-100 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            {title || 'Account Activated!'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {description || (
              <>
                <strong>{employeeName || 'The employee'}</strong> has been activated and login credentials are ready.
              </>
            )}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Office Email Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              <span>Office Email (Username)</span>
              <button
                type="button"
                onClick={() => handleCopyEmail(result.office_email)}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold normal-case transition"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600 text-xs">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-sm font-semibold text-slate-800 break-all select-all">
              {result.office_email}
            </div>
          </div>

          {/* Password Setup Link Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-2xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Password Setup Link</span>
              <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 normal-case">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Emailed Directly
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Sent to employee inbox</span>
              <span className="text-[11px] text-slate-500 font-medium">Never visible to Admin</span>
            </div>
          </div>

          {/* Confidential Password Notice */}
          <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200/70 text-blue-950 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Employee Sets Own Password:</strong> The employee clicks the setup link in their email to create their password. If they ever forget it, the Admin can click "Resend Login" or the employee can use "Forgot Password".
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
