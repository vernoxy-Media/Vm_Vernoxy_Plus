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
  const [copiedField, setCopiedField] = useState<'email' | 'all' | null>(null);

  if (!isOpen || !result) return null;

  const handleCopy = (text: string, field: 'email' | 'all') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const allCredentialsText = `Vernoxy Pulse Employee Login\nName: ${employeeName || 'Employee'}\nOffice Email: ${result.office_email}\nNote: One-time temporary activation credentials have been sent directly to your email inbox.\n(You will be required to change your password on first login)`;

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
                onClick={() => handleCopy(result.office_email, 'email')}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold normal-case transition"
              >
                {copiedField === 'email' ? (
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

          {/* Temporary Password Card (BFD Marker 5: Nobody types it, and the Admin never sees it) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-2xs font-bold text-slate-400 uppercase tracking-wider">
              <span>One-Time System Password</span>
              <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 normal-case">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Emailed Directly
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="font-mono text-base font-bold text-slate-400 tracking-widest select-none">
                ••••••••••••••••
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Never visible to Admin</span>
            </div>
          </div>

          {/* Mandatory Password Renewal Notice */}
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Password Renewal Required:</strong> The employee will be forced to change this temporary password immediately upon their first login before accessing the system.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleCopy(allCredentialsText, 'all')}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            {copiedField === 'all' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied Details</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Login Details</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
