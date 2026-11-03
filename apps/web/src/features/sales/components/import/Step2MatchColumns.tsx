import React, { useState } from 'react';
import {
  
  
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  
} from 'lucide-react';
import { useSalesImportExportControllerCheck } from '@vernoxy-pulse/api-client';
import { parseApiError } from '../../utils/error';
import type {
  ImportUploadResponse,
  ImportCheckResponse,
} from '../../types/sales.types';

export interface Step2MatchColumnsProps {
  uploadData: ImportUploadResponse;
  onBack: () => void;
  onChecked: (data: ImportCheckResponse) => void;
}

export const Step2MatchColumns: React.FC<Step2MatchColumnsProps> = ({
  uploadData,
  onBack,
  onChecked,
}) => {
  // Initialize mapping from detected columns
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (uploadData.columns) {
      uploadData.columns.forEach((col) => {
        if (col.field_key) {
          initial[col.file_column] = col.field_key;
        }
      });
    }
    return initial;
  });

  const [createLeads, setCreateLeads] = useState(false);
  const [existingRows, setExistingRows] = useState<'skip' | 'update_empty'>('skip');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkMutation = useSalesImportExportControllerCheck();

  const handleFieldChange = (fileColumn: string, targetField: string) => {
    setMapping((prev) => {
      const updated = { ...prev };
      if (!targetField) {
        delete updated[fileColumn];
      } else {
        updated[fileColumn] = targetField;
      }
      return updated;
    });
  };

  const isCompanyNameMapped = Object.values(mapping).some(
    (field) => field === 'company.name' || field === 'name',
  );

  const handleSubmitCheck = async () => {
    setErrorMessage(null);

    if (!isCompanyNameMapped) {
      setErrorMessage('Company Name is a mandatory field and must be mapped to one of your columns.');
      return;
    }

    try {
      const response = await checkMutation.mutateAsync({
        jobId: uploadData.job_id,
        data: {
          mapping,
          create_leads: createLeads,
          existing_rows: existingRows,
        },
      });

      const parsed: ImportCheckResponse =
        (response as unknown as { data?: ImportCheckResponse })?.data ??
        (response as unknown as ImportCheckResponse);

      onChecked(parsed);
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Validation check failed. Please review column mappings.');
    }
  };

  const availableFields = uploadData.fields || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Match Spreadsheet Columns</h2>
          <p className="text-xs text-gray-500">
            Map each column from your file to the corresponding Vernoxy Pulse system field.
          </p>
        </div>

        <div className="flex items-center gap-2 text-2xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          <span className="font-semibold text-gray-900">{uploadData.file?.rows || 0}</span> rows detected in{' '}
          <span className="font-semibold text-gray-900">{uploadData.file?.name}</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Mapping Required</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Import Options Box */}
      <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4 text-xs">
        <h3 className="font-bold text-gray-900 uppercase tracking-wider text-2xs">Import Behavior & Options</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Also create leads toggle */}
          <div className="flex items-start justify-between p-3 rounded-lg border border-gray-200 bg-white">
            <div className="pr-3">
              <span className="font-semibold text-gray-900 block">Also Create Sales Leads</span>
              <span className="text-2xs text-gray-500">
                Automatically convert imported companies into New leads.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCreateLeads(!createLeads)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                createLeads ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  createLeads ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Existing records policy */}
          <div className="space-y-1.5 p-3 rounded-lg border border-gray-200 bg-white">
            <span className="font-semibold text-gray-900 block">Duplicate Handling Policy</span>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="existing_rows"
                  checked={existingRows === 'skip'}
                  onChange={() => setExistingRows('skip')}
                  className="w-3.5 h-3.5 text-primary"
                />
                <span className="text-2xs text-gray-700">Skip existing rows</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="existing_rows"
                  checked={existingRows === 'update_empty'}
                  onChange={() => setExistingRows('update_empty')}
                  className="w-3.5 h-3.5 text-primary"
                />
                <span className="text-2xs text-gray-700">Fill empty fields only</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Column Matching Table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-2xs">
              <th className="py-3 px-4">Your File Column</th>
              <th className="py-3 px-4 w-12 text-center">Match</th>
              <th className="py-3 px-4">Vernoxy Pulse System Field</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {uploadData.columns?.map((col) => {
              const currentVal = mapping[col.file_column] || '';
              const isMatched = Boolean(currentVal);
              const isRequiredField = currentVal === 'company.name' || currentVal === 'name';

              return (
                <tr key={col.file_column} className="hover:bg-gray-50/75">
                  <td className="py-3 px-4 font-semibold text-gray-800">
                    <span>{col.file_column}</span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <ArrowRight
                      className={`w-4 h-4 mx-auto ${
                        isMatched ? 'text-primary' : 'text-gray-300'
                      }`}
                    />
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={currentVal}
                        onChange={(e) => handleFieldChange(col.file_column, e.target.value)}
                        className={`w-full max-w-sm px-3 py-1.5 rounded-lg border text-xs bg-white focus:ring-2 focus:ring-primary/20 ${
                          isRequiredField
                            ? 'border-emerald-400 bg-emerald-50/20 font-semibold text-emerald-900'
                            : isMatched
                            ? 'border-primary/40 font-medium text-gray-900'
                            : 'border-gray-300 text-gray-500'
                        }`}
                      >
                        <option value="">— Do not import this column —</option>
                        {availableFields.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.header} {f.required ? '(* Required)' : ''} ({f.group})
                          </option>
                        ))}
                      </select>

                      {isRequiredField && (
                        <span className="shrink-0 text-2xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Required
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Upload</span>
        </button>

        <button
          type="button"
          onClick={handleSubmitCheck}
          disabled={checkMutation.isPending || !isCompanyNameMapped}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm transition-all min-h-[44px]"
        >
          {checkMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Run Pre-Import Check</span>
        </button>
      </div>
    </div>
  );
};
