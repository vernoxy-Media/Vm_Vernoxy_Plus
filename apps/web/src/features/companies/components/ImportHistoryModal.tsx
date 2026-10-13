import React from 'react';
import { X, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import { useAuthenticatedDownload } from '../../../hooks/use-authenticated-download';

export interface ImportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportHistoryModal: React.FC<ImportHistoryModalProps> = ({ isOpen, onClose }) => {
  const { download, isDownloading } = useAuthenticatedDownload();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/v1/companies/import'],
    queryFn: () => customFetch<any>('/api/v1/companies/import?limit=15'),
    enabled: isOpen,
    refetchInterval: isOpen ? 5000 : false,
  });

  if (!isOpen) return null;

  const jobs = data?.jobs || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Import History</h3>
              <p className="text-xs text-slate-500">Recent company import jobs and downloadable audit reports</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 flex-1">
          {isLoading ? (
            <div className="py-12 flex justify-center items-center text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">Loading history...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">No import history found.</div>
          ) : (
            <div className="space-y-3">
              {jobs.map((j: any) => (
                <div
                  key={j.job_id}
                  className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-900 uppercase">{j.format}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        {new Date(j.created_at).toLocaleString()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          j.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : j.status === 'completed_with_errors'
                            ? 'bg-amber-100 text-amber-800'
                            : j.status === 'failed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {j.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-3">
                      <span>Total: {j.total_rows}</span>
                      <span>Created: {j.created_rows}</span>
                      <span>Skipped: {j.skipped_rows}</span>
                      {j.failed_rows > 0 && <span className="text-rose-600">Failed: {j.failed_rows}</span>}
                    </div>
                  </div>

                  {j.has_report && (
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() =>
                        download(`/api/v1/companies/import/${j.job_id}/report`, `import-report-${j.job_id.slice(0, 8)}.csv`)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shrink-0 shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      Report
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
