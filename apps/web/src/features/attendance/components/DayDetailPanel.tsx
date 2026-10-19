import React, { useEffect } from 'react';
import {
  X,
  Calendar,
  AlertCircle,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import { useDayDetail } from '../hooks/use-attendance';
import { DayDetailStats } from './DayDetailStats';
import { DayDetailTimeline } from './DayDetailTimeline';

export interface DayDetailPanelProps {
  isOpen: boolean;
  date: string | null;
  onClose: () => void;
  onOpenCorrection: (date: string) => void;
}

export const DayDetailPanel: React.FC<DayDetailPanelProps> = ({
  isOpen,
  date,
  onClose,
  onOpenCorrection,
}) => {
  const { data, isLoading, error } = useDayDetail(isOpen ? date : null);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !date) return null;

  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${formattedDate}`}
      className="fixed inset-0 z-50 overflow-hidden"
    >
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-0 overflow-hidden pointer-events-none flex lg:justify-end items-end lg:items-stretch">
        <div className="pointer-events-auto w-full lg:w-[420px] max-h-[88vh] lg:max-h-full bg-white rounded-t-3xl lg:rounded-t-none lg:rounded-l-3xl shadow-2xl border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col animate-in slide-in-from-bottom lg:slide-in-from-right duration-200">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Day Record Details
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {formattedDate}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-xs text-slate-500 font-semibold">Loading day records...</p>
              </div>
            ) : error || !data ? (
              <div className="p-6 text-center text-slate-500">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">Failed to load day record</p>
                <p className="text-xs text-slate-500 mt-1">Please try again later.</p>
              </div>
            ) : (
              <>
                <DayDetailStats data={data} />

                {data.leave_holiday_info && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{data.leave_holiday_info}</span>
                  </div>
                )}

                <DayDetailTimeline timeline={data.timeline} breaks={data.breaks} />
              </>
            )}
          </div>

          {data?.can_request_correction && (
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCorrection(date);
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-colors"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Request Correction for this Day</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayDetailPanel;
