import React from 'react';
import { Calendar } from 'lucide-react';

export interface CorrectionFormFieldsProps {
  date: string;
  punchIn: string;
  setPunchIn: (val: string) => void;
  punchOut: string;
  setPunchOut: (val: string) => void;
  breakMinutes: number;
  setBreakMinutes: (val: number) => void;
  reason: string;
  setReason: (val: string) => void;
}

export const CorrectionFormFields: React.FC<CorrectionFormFieldsProps> = ({
  date,
  punchIn,
  setPunchIn,
  punchOut,
  setPunchOut,
  breakMinutes,
  setBreakMinutes,
  reason,
  setReason,
}) => {
  return (
    <>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{date}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="corr-punch-in" className="block text-xs font-semibold text-slate-600 mb-1">
            Punch In *
          </label>
          <input
            id="corr-punch-in"
            type="time"
            value={punchIn}
            onChange={(e) => setPunchIn(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="corr-punch-out" className="block text-xs font-semibold text-slate-600 mb-1">
            Punch Out *
          </label>
          <input
            id="corr-punch-out"
            type="time"
            value={punchOut}
            onChange={(e) => setPunchOut(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="corr-break-mins" className="block text-xs font-semibold text-slate-600 mb-1">
          Break Time (minutes)
        </label>
        <input
          id="corr-break-mins"
          type="number"
          min="0"
          max="480"
          value={breakMinutes}
          onChange={(e) => setBreakMinutes(Number(e.target.value))}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="corr-reason" className="block text-xs font-semibold text-slate-600 mb-1">
          Reason for Correction *
        </label>
        <textarea
          id="corr-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Forgot to punch out due to client visit, machine sync error..."
          required
          className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  );
};
