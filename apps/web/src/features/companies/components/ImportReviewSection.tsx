import React from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ImportSummary } from '../../../components/ImportSummary';
import { IssueTable } from '../../../components/IssueTable';

export interface ImportReviewSectionProps {
  previewResult: any;
  isConfirming: boolean;
  onConfirm: () => void;
  onReset: () => void;
}

export const ImportReviewSection: React.FC<ImportReviewSectionProps> = ({
  previewResult,
  isConfirming,
  onConfirm,
  onReset,
}) => {
  return (
    <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">3. Review Preview & Summary</h2>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            previewResult.can_proceed
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-rose-100 text-rose-800'
          }`}
        >
          {previewResult.can_proceed ? 'Ready to Import' : 'Action Required'}
        </span>
      </div>

      <ImportSummary
        mode="preview"
        total={previewResult.totals.total_rows}
        created={previewResult.totals.will_create}
        skipped={previewResult.totals.will_skip_duplicates}
        warnings={previewResult.totals.warning_rows}
        errors={previewResult.totals.error_rows}
      />

      {previewResult.sample_issues?.length > 0 && (
        <IssueTable issues={previewResult.sample_issues} />
      )}

      {!previewResult.can_proceed && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <p className="font-semibold">Cannot proceed with import</p>
            <p className="mt-0.5">
              Some rows have validation errors. Check "Import valid rows only" above to import the clean records, or fix your spreadsheet and upload again.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          disabled={!previewResult.can_proceed || isConfirming}
          onClick={onConfirm}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-xs font-semibold text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
        >
          {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Confirm & Start Import
        </button>
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
        >
          Cancel / Change File
        </button>
      </div>
    </div>
  );
};
