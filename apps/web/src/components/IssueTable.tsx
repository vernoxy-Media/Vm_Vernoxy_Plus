import React, { useState, useMemo } from 'react';
import { AlertTriangle, XCircle, Loader2 } from 'lucide-react';

export interface IssueItem {
  row_number: number;
  field_name?: string;
  issue_code: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface IssueTableProps {
  issues: IssueItem[];
  totalCount?: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export const IssueTable: React.FC<IssueTableProps> = ({
  issues,
  totalCount,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warning'>('all');

  const filteredIssues = useMemo(() => {
    if (severityFilter === 'all') return issues;
    return issues.filter((i) => i.severity === severityFilter);
  }, [issues, severityFilter]);

  const errorCount = useMemo(() => issues.filter((i) => i.severity === 'error').length, [issues]);
  const warningCount = useMemo(() => issues.filter((i) => i.severity === 'warning').length, [issues]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-900">Issues & Feedback</h4>
          <span className="text-xs text-gray-500">
            ({totalCount !== undefined ? totalCount : issues.length} total)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSeverityFilter('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              severityFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({issues.length})
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('error')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              severityFilter === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Errors ({errorCount})
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('warning')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              severityFilter === 'warning'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Warnings ({warningCount})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-80">
        <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider sticky top-0">
            <tr>
              <th className="py-2.5 px-3 font-semibold">Row</th>
              <th className="py-2.5 px-3 font-semibold">Severity</th>
              <th className="py-2.5 px-3 font-semibold">Field</th>
              <th className="py-2.5 px-3 font-semibold">Code</th>
              <th className="py-2.5 px-3 font-semibold">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {filteredIssues.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  No issues found matching selected filter.
                </td>
              </tr>
            ) : (
              filteredIssues.map((issue, idx) => (
                <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-2 px-3 font-medium text-gray-900 whitespace-nowrap">
                    {issue.row_number}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {issue.severity === 'error' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                        <XCircle className="w-3 h-3 text-rose-600" /> Error
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Warning
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 font-mono text-gray-800 whitespace-nowrap">
                    {issue.field_name || '-'}
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                    {issue.issue_code}
                  </td>
                  <td className="py-2 px-3 text-gray-600">{issue.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && onLoadMore && (
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
          <button
            type="button"
            disabled={isLoadingMore}
            onClick={onLoadMore}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Load More Issues
          </button>
        </div>
      )}
    </div>
  );
};
