import React, { useState } from 'react';
import { Link, } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  
  Download,
  RotateCcw,
  
  
  
  
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useSalesImportExportControllerUndo } from '@vernoxy-pulse/api-client';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { downloadSalesFile } from '../../utils/download';
import { formatRemainingHours } from '../../utils/date';
import type { BlockerItem } from '../common/ConfirmDialog';
import { parseApiError } from '../../utils/error';
import { useSalesRights } from '../../hooks/useSalesRights';
import type { ImportConfirmResponse } from '../../types/sales.types';

export interface Step4ResultProps {
  confirmData: ImportConfirmResponse;
  onReset: () => void;
}

export const Step4Result: React.FC<Step4ResultProps> = ({ confirmData, onReset }) => {
  const queryClient = useQueryClient();
  const { isAdmin } = useSalesRights();

  const [undoModalOpen, setUndoModalOpen] = useState(false);
  const [undoError, setUndoError] = useState<string | null>(null);
  const [undoBlockers, setUndoBlockers] = useState<BlockerItem[]>([]);
  const [isUndone, setIsUndone] = useState(false);
  const [isDownloadingErrors, setIsDownloadingErrors] = useState(false);

  const undoMutation = useSalesImportExportControllerUndo({
    mutation: {
      onSuccess: () => {
        setIsUndone(true);
        setUndoModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/companies'] });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/leads'] });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/history'] });
      },
      onError: (err: unknown) => {
        const parsed = parseApiError(err);
        setUndoError(parsed.message || 'Cannot undo this import');
        setUndoBlockers(parsed.blockers || []);
      },
    },
  });

  const handleDownloadErrors = async () => {
    setIsDownloadingErrors(true);
    try {
      await downloadSalesFile(`/api/v1/sales/imports/${confirmData.job_id}/error-rows`);
    } catch (err: unknown) {
      alert('Failed to download error rows.');
    } finally {
      setIsDownloadingErrors(false);
    }
  };

  const handleConfirmUndo = async () => {
    setUndoError(null);
    setUndoBlockers([]);
    await undoMutation.mutateAsync({ jobId: confirmData.job_id });
  };

  const canUndo = Boolean(confirmData.batch?.can_undo_until) && !isUndone;
  const remainingUndoHours = confirmData.batch?.can_undo_until
    ? formatRemainingHours(confirmData.batch.can_undo_until)
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="text-center max-w-md mx-auto space-y-2">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-md ${
            isUndone
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-600'
          }`}
        >
          {isUndone ? <RotateCcw className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          {isUndone ? 'Import Successfully Undone' : 'Spreadsheet Import Completed'}
        </h2>
        <p className="text-xs text-gray-500">
          {isUndone
            ? 'All records created during this import job have been safely rolled back.'
            : 'Your companies have been processed and added to Vernoxy Pulse.'}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 text-center space-y-0.5">
          <span className="text-3xs font-bold text-emerald-800 uppercase tracking-wider">Created</span>
          <p className="text-xl font-bold text-emerald-700">
            {confirmData.companies_created || 0}
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 text-center space-y-0.5">
          <span className="text-3xs font-bold text-blue-800 uppercase tracking-wider">Updated</span>
          <p className="text-xl font-bold text-blue-700">
            {confirmData.companies_updated || 0}
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 text-center space-y-0.5">
          <span className="text-3xs font-bold text-purple-800 uppercase tracking-wider">Leads Created</span>
          <p className="text-xl font-bold text-purple-700">
            {confirmData.leads_created || 0}
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 text-center space-y-0.5">
          <span className="text-3xs font-bold text-gray-500 uppercase tracking-wider">Skipped</span>
          <p className="text-xl font-bold text-gray-700">
            {confirmData.skipped_existing || 0}
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-center space-y-0.5 col-span-2 sm:col-span-1">
          <span className="text-3xs font-bold text-red-800 uppercase tracking-wider">Errors</span>
          <p className="text-xl font-bold text-red-700">
            {confirmData.rows_with_errors || 0}
          </p>
        </div>
      </div>

      {/* Admin Undo & Error Download Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50/60 text-xs">
        <div className="space-y-0.5">
          {isAdmin && canUndo ? (
            <div className="flex items-center gap-1.5 text-gray-800 font-medium">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>
                Admin Undo Window: <strong>{remainingUndoHours || 'Active'}</strong>
              </span>
            </div>
          ) : (
            <span className="text-gray-500">Job ID: {confirmData.job_id}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {confirmData.rows_with_errors > 0 && (
            <button
              type="button"
              onClick={handleDownloadErrors}
              disabled={isDownloadingErrors}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Error Rows</span>
            </button>
          )}

          {isAdmin && canUndo && (
            <button
              type="button"
              onClick={() => {
                setUndoModalOpen(true);
                setUndoError(null);
                setUndoBlockers([]);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg border border-amber-300 bg-white text-amber-800 hover:bg-amber-50 shadow-2xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Undo This Import</span>
            </button>
          )}
        </div>
      </div>

      {/* Row by Row Results */}
      {confirmData.row_results && confirmData.row_results.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Row Processing Details ({confirmData.row_results.length})
          </h3>

          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-2xs sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 w-16">Row #</th>
                    <th className="py-2.5 px-3">Company Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Code Assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {confirmData.row_results.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 font-mono text-gray-500">{row.row}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{row.company}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold ${
                            row.status === 'created'
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.status === 'updated'
                              ? 'bg-blue-100 text-blue-800'
                              : row.status === 'skipped'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-2xs text-gray-600">
                        {row.company_code || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation CTAs */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
        >
          Import Another File
        </button>

        <Link
          to="/sales/companies"
          className="inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all min-h-[44px]"
        >
          <span>View Companies</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Undo Confirmation Dialog */}
      <ConfirmDialog
        isOpen={undoModalOpen}
        onClose={() => {
          if (!undoMutation.isPending) {
            setUndoModalOpen(false);
            setUndoError(null);
            setUndoBlockers([]);
          }
        }}
        onConfirm={handleConfirmUndo}
        title="Undo Spreadsheet Import?"
        message={
          undoError ?? 'Are you sure you want to rollback this import? This action will remove all companies created in this batch. It can only be performed within 24 hours of import if no subsequent follow-ups or activities were logged.'
        }
        confirmLabel="Rollback Import"
        cancelLabel="Keep Import"
        variant="danger"
        isLoading={undoMutation.isPending}
        blockers={undoBlockers}
      />
    </div>
  );
};
