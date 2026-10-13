import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Ban } from 'lucide-react';

export interface JobProgressProps {
  status: string;
  percentage: number;
  processed: number;
  total: number;
  errorMessage?: string | null;
  onCancel?: () => void;
  isCanceling?: boolean;
}

export const JobProgress: React.FC<JobProgressProps> = ({
  status,
  percentage,
  processed,
  total,
  errorMessage,
  onCancel,
  isCanceling = false,
}) => {
  const isRunning = status === 'running' || status === 'queued';
  const isCompleted = status === 'completed' || status === 'completed_with_errors';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';

  const getStatusBadge = () => {
    switch (status) {
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Queued
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'completed_with_errors':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Completed with errors
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Ban className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const barColor = isFailed
    ? 'bg-rose-600'
    : isCancelled
    ? 'bg-gray-400'
    : isCompleted
    ? 'bg-emerald-600'
    : 'bg-indigo-600';

  return (
    <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h4 className="text-sm font-semibold text-gray-900">Import Progress</h4>
          {getStatusBadge()}
        </div>
        {isRunning && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isCanceling}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
          >
            {isCanceling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5 text-gray-500" />}
            Cancel
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium text-gray-600">
          <span>{total > 0 ? `${processed.toLocaleString()} of ${total.toLocaleString()} rows processed` : 'Preparing rows...'}</span>
          <span>{percentage}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden"
        >
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ease-out ${barColor}`}
            style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
