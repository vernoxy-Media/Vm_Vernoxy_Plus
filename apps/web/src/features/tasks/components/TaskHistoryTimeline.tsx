import React from 'react';
import { TaskHistoryItemDto } from '@vernoxy-pulse/api-client';
import { History, GitCommit, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export interface TaskHistoryTimelineProps {
  history: TaskHistoryItemDto[];
}

export const TaskHistoryTimeline: React.FC<TaskHistoryTimelineProps> = ({ history = [] }) => {
  if (history.length === 0) {
    return <div className="text-xs text-slate-400 py-3 text-center">No history recorded</div>;
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'approved':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'rejected':
        return <XCircle className="w-3.5 h-3.5 text-rose-600" />;
      case 'stage_changed':
      case 'requested':
      case 'withdrawn':
        return <ArrowRight className="w-3.5 h-3.5 text-blue-600" />;
      default:
        return <GitCommit className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
        <History className="w-4 h-4 text-slate-400" /> Activity History
      </div>
      <div className="relative pl-4 space-y-4 border-l border-slate-200 ml-2">
        {history.map((item) => (
          <div key={item.history_id} className="relative text-xs">
            <div className="absolute -left-[23px] top-0.5 rounded-full bg-white p-0.5 ring-2 ring-slate-100">
              {getEventIcon(item.event_type)}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-slate-800 capitalize">
                {item.event_type.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-slate-400">
                {new Date(item.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {item.actor_name && (
              <p className="text-slate-500 text-[11px]">by {item.actor_name}</p>
            )}
            {item.from_stage && item.to_stage && (
              <p className="text-slate-600 font-mono text-[11px] mt-0.5">
                {item.from_stage} → {item.to_stage}
              </p>
            )}
            {item.note && (
              <div className="mt-1 rounded-lg bg-slate-50 p-2 text-slate-700 italic border border-slate-100">
                "{item.note}"
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
