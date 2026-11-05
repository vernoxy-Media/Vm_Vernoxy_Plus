import React, { useState } from 'react';
import {
  
  AlertCircle,
  
  Download,
  
  ArrowLeft,
  
  Loader2,
  
} from 'lucide-react';
import { useSalesImportExportControllerConfirm } from '@vernoxy-pulse/api-client';
import { downloadSalesFile } from '../../utils/download';
import { parseApiError } from '../../utils/error';
import type {
  ImportCheckResponse,
  ImportConfirmResponse,
} from '../../types/sales.types';

export interface Step3CheckImportProps {
  checkData: ImportCheckResponse;
  onBack: () => void;
  onConfirmed: (data: ImportConfirmResponse) => void;
}

export const Step3CheckImport: React.FC<Step3CheckImportProps> = ({
  checkData,
  onBack,
  onConfirmed,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloadingErrors, setIsDownloadingErrors] = useState(false);

  const confirmMutation = useSalesImportExportControllerConfirm();

  const handleDownloadErrors = async () => {
    setIsDownloadingErrors(true);
    try {
      await downloadSalesFile(`/api/v1/sales/imports/${checkData.job_id}/error-rows`);
    } catch (err: unknown) {
      alert('Failed to download error rows.');
    } finally {
      setIsDownloadingErrors(false);
    }
  };

  const handleExecuteImport = async () => {
    setErrorMessage(null);
    try {
      const response = await confirmMutation.mutateAsync({
        jobId: checkData.job_id,
      });

      const parsed: ImportConfirmResponse =
        (response as unknown as { data?: ImportConfirmResponse })?.data ??
        (response as unknown as ImportConfirmResponse);

      onConfirmed(parsed);
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Import execution failed. Please verify records.');
    }
  };

  const s = checkData.summary || {
    total: 0,
    ready: 0,
    already_in_database: 0,
    with_errors: 0,
  };

  const canImport = checkData.can_import && s.ready > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Pre-Import Verification Summary</h2>
          <p className="text-xs text-gray-500">
            Review data hygiene results. Rows with errors are skipped, so your company list stays clean.
          </p>
        </div>

        {s.with_errors > 0 && (
          <button
            type="button"
            onClick={handleDownloadErrors}
            disabled={isDownloadingErrors}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 shadow-2xs transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Error Rows</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Import Blocked</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
          <span className="text-2xs font-bold text-gray-500 uppercase tracking-wider">Total Rows</span>
          <p className="text-2xl font-bold text-gray-900">{s.total}</p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1">
          <span className="text-2xs font-bold text-emerald-800 uppercase tracking-wider">Ready to Import</span>
          <p className="text-2xl font-bold text-emerald-700">{s.ready}</p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1">
          <span className="text-2xs font-bold text-amber-800 uppercase tracking-wider">Existing in DB</span>
          <p className="text-2xl font-bold text-amber-700">{s.already_in_database}</p>
        </div>

        <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-1">
          <span className="text-2xs font-bold text-red-800 uppercase tracking-wider">With Errors</span>
          <p className="text-2xl font-bold text-red-700">{s.with_errors}</p>
        </div>
      </div>

      {/* Forecast Scope */}
      <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/30 text-xs space-y-2">
        <h4 className="font-semibold text-gray-900">What will happen when you click Import:</h4>
        <ul className="list-disc pl-5 space-y-1 text-gray-600">
          <li>
            <strong>{checkData.will_create?.companies || s.ready}</strong> new companies will be added.
          </li>
          {checkData.will_create?.leads ? (
            <li>
              <strong>{checkData.will_create.leads}</strong> new sales leads will be automatically opened.
            </li>
          ) : null}
          {s.already_in_database > 0 && (
            <li>
              <strong>{s.already_in_database}</strong> existing companies will be{' '}
              {checkData.options?.existing_rows === 'update_empty' ? 'enriched with empty field updates' : 'skipped'}.
            </li>
          )}
          {s.with_errors > 0 && (
            <li className="text-red-700 font-medium">
              {s.with_errors} rows with validation errors will NOT be imported.
            </li>
          )}
        </ul>
      </div>

      {/* Error Breakdown Table */}
      {checkData.errors && checkData.errors.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>Rows Requiring Correction ({checkData.errors.length})</span>
          </h4>

          <div className="rounded-xl border border-red-200 overflow-hidden shadow-2xs">
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-red-50 border-b border-red-200 text-red-800 font-semibold uppercase tracking-wider text-2xs sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 w-16">Row #</th>
                    <th className="py-2.5 px-3">Company Name</th>
                    <th className="py-2.5 px-3">Field</th>
                    <th className="py-2.5 px-3">Validation Problem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 bg-white">
                  {checkData.errors.map((err, i) => (
                    <tr key={i} className="hover:bg-red-50/30">
                      <td className="py-2.5 px-3 font-mono font-semibold text-red-800">
                        {err.row}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-900 truncate max-w-[200px]">
                        {err.company || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-2xs text-gray-600">
                        {err.field}
                      </td>
                      <td className="py-2.5 px-3 text-red-700">{err.problem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Adjust Mappings</span>
        </button>

        <button
          type="button"
          onClick={handleExecuteImport}
          disabled={!canImport || confirmMutation.isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-all min-h-[44px]"
        >
          {confirmMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Import {s.ready} Verified Companies</span>
        </button>
      </div>
    </div>
  );
};
