import React from 'react';
import { Play, Loader2 } from 'lucide-react';
import { FileDropzone } from '../../../components/FileDropzone';

export interface ImportUploadSectionProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  duplicatePolicy: 'skip_duplicates' | 'import_anyway';
  onDuplicatePolicyChange: (policy: 'skip_duplicates' | 'import_anyway') => void;
  skipInvalidRows: boolean;
  onSkipInvalidRowsChange: (skip: boolean) => void;
  onPreview: () => void;
  isPreviewing: boolean;
  previewError: string | null;
}

export const ImportUploadSection: React.FC<ImportUploadSectionProps> = ({
  file,
  onFileSelect,
  duplicatePolicy,
  onDuplicatePolicyChange,
  skipInvalidRows,
  onSkipInvalidRowsChange,
  onPreview,
  isPreviewing,
  previewError,
}) => {
  return (
    <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
      <h2 className="text-sm font-semibold text-slate-900">2. Upload Spreadsheet & Options</h2>

      <FileDropzone
        file={file}
        onFileSelect={onFileSelect}
        error={previewError}
        disabled={isPreviewing}
      />

      {file && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Duplicate Policy</label>
            <div className="flex flex-wrap gap-4 text-xs text-slate-700">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="duplicate_policy"
                  value="skip_duplicates"
                  checked={duplicatePolicy === 'skip_duplicates'}
                  onChange={() => onDuplicatePolicyChange('skip_duplicates')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Skip duplicate companies (recommended)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="duplicate_policy"
                  value="import_anyway"
                  checked={duplicatePolicy === 'import_anyway'}
                  onChange={() => onDuplicatePolicyChange('import_anyway')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Import anyway</span>
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={skipInvalidRows}
                onChange={(e) => onSkipInvalidRowsChange(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Import valid rows only (skip rows that fail validation)</span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={isPreviewing}
              onClick={onPreview}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-xs font-semibold text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {isPreviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Inspect & Preview Spreadsheet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
