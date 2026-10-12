import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export interface DuplicateMatchItem {
  id?: number | string;
  name: string;
  detail?: string;
  reason?: string;
  actionText?: string;
}

export interface DuplicateNoticeProps {
  title?: string;
  description?: string;
  reason?: string;
  matches?: DuplicateMatchItem[];
  onAction?: (match?: any) => void;
  actionLabel?: string;
  className?: string;
}

export const DuplicateNotice: React.FC<DuplicateNoticeProps> = ({
  title = 'Potential duplicate records found',
  description,
  reason,
  matches,
  onAction,
  actionLabel = 'View',
  className = '',
}) => {
  // If neither matches nor a single reason/title provided, don't show
  if ((!matches || matches.length === 0) && !reason) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-amber-900 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-amber-900">{title}</h4>
              {(description || reason) && (
                <p className="text-xs text-amber-700 mt-0.5">{reason || description}</p>
              )}
            </div>
            {onAction && !matches && (
              <button
                type="button"
                onClick={() => onAction()}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors shrink-0"
              >
                {actionLabel}
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {matches && matches.length > 0 && (
            <ul className="mt-2.5 divide-y divide-amber-200/60 border-t border-amber-200/60 text-xs">
              {matches.map((m, idx) => (
                <li key={m.id || idx} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-medium text-amber-950">{m.name}</span>
                    {m.reason && <span className="text-amber-700 ml-2">({m.reason})</span>}
                    {m.detail && <p className="text-amber-600 truncate mt-0.5">{m.detail}</p>}
                  </div>
                  {onAction && (
                    <button
                      type="button"
                      onClick={() => onAction(m)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors shrink-0"
                    >
                      {m.actionText || actionLabel}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
