import React from 'react';
import { History, Loader2 } from 'lucide-react';
import { useSalesActivityControllerHistory } from '@vernoxy-pulse/api-client';
import { formatDateTimeIST, timeAgo } from '../../utils/date';
import { unwrapList } from '../../utils/response';
import type { ActivityItem } from '../../types/sales.types';

export interface LeadActivityTimelineProps {
  leadId: number;
}

export const LeadActivityTimeline: React.FC<LeadActivityTimelineProps> = ({ leadId }) => {
  const { data: rawData, isLoading } = useSalesActivityControllerHistory(
    leadId,
    undefined as never,
    {
      query: {
        enabled: Boolean(leadId),
      },
    },
  );

  const historyItems: ActivityItem[] = unwrapList<ActivityItem>(rawData);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <History className="w-4 h-4 text-gray-600" />
        <h3 className="text-base font-semibold text-gray-900">
          Activity History ({historyItems.length})
        </h3>
      </div>

      {historyItems.length === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center">
          No activity recorded yet.
        </p>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-gray-100">
          {historyItems.map((item) => (
            <div key={item.log_id} className="relative flex items-start gap-3 pl-7 text-xs">
              <span className="absolute left-2 top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-white" />
              <div className="space-y-0.5 flex-1 min-w-0">
                <p className="font-semibold text-gray-900 leading-tight">
                  {item.summary || item.event}
                </p>
                <div className="flex items-center gap-2 text-2xs text-gray-400 pt-0.5">
                  {item.performed_by && <span>By {item.performed_by.name}</span>}
                  <span>•</span>
                  <span>{formatDateTimeIST(item.performed_at)}</span>
                  <span>({timeAgo(item.performed_at)})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
