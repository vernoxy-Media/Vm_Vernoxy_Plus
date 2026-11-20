import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Download, Info, Loader2, Play, RotateCcw } from 'lucide-react';
import { getAccessToken } from '@vernoxy-pulse/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/shared/layouts/AdminLayout';
import { useAuthenticatedDownload } from '@/shared/hooks/use-authenticated-download';
import { FileDropzone } from '@/features/data-transfer/components/FileDropzone';
import { ImportSummary } from '@/features/data-transfer/components/ImportSummary';
import { IssueTable } from '@/features/data-transfer/components/IssueTable';

const BASE = '/api/v1/employees/import';
const MAX_ROWS = 100;

interface PreviewResult {
  totalRows: number;
  willCreate: number;
  willSkip: number;
  warningRows: number;
  errorRows: number;
  issues: Array<{ row: number; field: string; code: string; message: string; severity: 'error' | 'warning' }>;
  fileErrors: string[];
  canImport: boolean;
}

interface RowResult {
  rowNumber: number;
  status: 'created' | 'skipped' | 'failed';
  code?: string;
  message?: string;
  employeeCode?: string;
  welcomeEmail?: 'requested' | 'not_requested';
}

interface ImportOutcome {
  welcomeEmailRequested: boolean;
  welcomeEmailCount: number;
  imported: boolean;
  reason?: string;
  created: number;
  skipped: number;
  failed: number;
  rows: RowResult[];
}

/** Sends the file to the API and returns its JSON, or throws the message the API gave. */
async function postFile<T>(url: string, file: File, skipInvalidRows: boolean, sendWelcomeEmail = false): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('skip_invalid_rows', String(skipInvalidRows));
  formData.append('send_welcome_email', String(sendWelcomeEmail));

  const token = getAccessToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      msg = err.detail || err.message || msg;
    } catch {
      // keep the generic message
    }
    throw new Error(msg);
  }
  return res.json();
}

/** The report is built here from the result, so nothing about the import has to be stored on the server. */
function downloadReport(rows: RowResult[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    ['row_number', 'status', 'employee_code', 'welcome_email', 'code', 'message'].join(','),
    ...rows.map((r) => [r.rowNumber, r.status, r.employeeCode, r.welcomeEmail, r.code, r.message].map(esc).join(',')),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `employee-import-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const EmployeeImportPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { download, isDownloading } = useAuthenticatedDownload();

  const [file, setFile] = useState<File | null>(null);
  const [skipInvalidRows, setSkipInvalidRows] = useState(false);
  // On by default: the Active employees that are created get their sign-in details by email
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  const [isChecking, setIsChecking] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  const handleCheck = async () => {
    if (!file) return;
    setIsChecking(true);
    setError(null);
    setPreview(null);
    try {
      setPreview(await postFile<PreviewResult>(`${BASE}/preview`, file, skipInvalidRows));
    } catch (err: any) {
      setError(err.message || 'Could not read the spreadsheet');
    } finally {
      setIsChecking(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    setError(null);
    try {
      const result = await postFile<ImportOutcome>(BASE, file, skipInvalidRows, sendWelcomeEmail);
      if (!result.imported) {
        setError(result.reason || 'Nothing was imported');
        return;
      }
      setOutcome(result);
      // The list of employees is out of date now
      queryClient.invalidateQueries();
    } catch (err: any) {
      setError(err.message || 'Could not import the employees');
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setOutcome(null);
    setError(null);
  };

  return (
    <AdminLayout title="Import Employees" fluid>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
          <button
            type="button"
            onClick={() => navigate('/admin/employees')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Back to employees"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Import Employees</h1>
        </div>

        {/* 1. Template */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">1. Download the template</h2>
              <p className="text-sm text-slate-500 mt-1">Fill it in and upload it in the next step. Do not change the column names.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isDownloading}
                onClick={() => download(`${BASE}/template?format=xlsx`, 'employees-template.xlsx')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Excel (.xlsx)
              </button>
              <button
                type="button"
                disabled={isDownloading}
                onClick={() => download(`${BASE}/template?format=csv`, 'employees-template.csv')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> CSV (.csv)
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <ul className="space-y-1 list-disc pl-4">
              <li>The system gives every employee a new Employee ID. The report lists them after the import.</li>
              <li>Only rows with Status = Active are imported. Other rows are skipped.</li>
              <li>Departments, designations, employment types, shifts and leave policies must already exist in the system.</li>
              <li>Several departments or designations go in one cell, separated by ; (for example: Admin; Finance & Accounts). The first designation is the main one.</li>
              <li>Reporting Manager is not imported. Set it on each employee afterwards.</li>
              <li>Every employee gets a one-time password, changed at the first sign in. Tick "Send welcome email" to mail it to each Active employee that is created.</li>
              <li>Write dates like 20-Nov-2026. Up to {MAX_ROWS} rows per file.</li>
            </ul>
          </div>
        </div>

        {/* 2. Upload and check */}
        {!outcome && (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
            <h2 className="text-sm font-semibold text-slate-900">2. Upload the spreadsheet</h2>
            <FileDropzone
              file={file}
              onFileSelect={(f) => {
                setFile(f);
                setPreview(null);
                setError(null);
              }}
              error={null}
              disabled={isChecking || isImporting}
            />

            {file && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipInvalidRows}
                    onChange={(e) => {
                      setSkipInvalidRows(e.target.checked);
                      setPreview(null);
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Import valid rows only (skip rows that have errors)</span>
                </label>
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendWelcomeEmail}
                    onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Send welcome email with the sign-in details to each employee that is created.
                    <span className="block text-slate-500">
                      Only Active employees are created, so only they are mailed. Untick this while you are testing with dummy data.
                    </span>
                  </span>
                </label>
                <div>
                  <button
                    type="button"
                    disabled={isChecking || isImporting}
                    onClick={handleCheck}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-xs font-semibold text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {isChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Check the file
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <p className="break-words">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* 3. Check result and import */}
        {!outcome && preview && (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">3. Check the result</h2>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  preview.canImport ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {preview.canImport ? 'Ready to import' : 'Action required'}
              </span>
            </div>

            {preview.fileErrors.length > 0 ? (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                {preview.fileErrors.map((m) => (
                  <p key={m}>{m}</p>
                ))}
              </div>
            ) : (
              <>
                <ImportSummary
                  mode="preview"
                  total={preview.totalRows}
                  created={preview.willCreate}
                  skipped={preview.willSkip}
                  warnings={preview.warningRows}
                  errors={preview.errorRows}
                />
                {preview.issues.length > 0 && (
                  <IssueTable
                    issues={preview.issues.map((i) => ({
                      row_number: i.row,
                      field_name: i.field,
                      issue_code: i.code,
                      message: i.message,
                      severity: i.severity,
                    }))}
                  />
                )}
                {!preview.canImport && preview.errorRows > 0 && (
                  <p className="text-xs text-rose-700">
                    Some rows have errors. Fix the spreadsheet and check it again, or tick "Import valid rows only" above.
                  </p>
                )}
              </>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={!preview.canImport || isImporting}
                onClick={handleImport}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-xs font-semibold text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isImporting
                  ? 'Adding employees…'
                  : `Import ${preview.willCreate} employee${preview.willCreate === 1 ? '' : 's'}${sendWelcomeEmail ? ' and send welcome email' : ' (no email)'}`}
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={reset}
                className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel / Change file
              </button>
            </div>
          </div>
        )}

        {/* 4. Result */}
        {outcome && (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              {outcome.created} employee{outcome.created === 1 ? '' : 's'} added
            </h3>
            <ImportSummary
              mode="result"
              total={outcome.rows.length}
              created={outcome.created}
              skipped={outcome.skipped}
              warnings={0}
              errors={outcome.failed}
            />
            {outcome.failed > 0 && (
              <ul className="text-xs text-rose-700 space-y-1">
                {outcome.rows
                  .filter((r) => r.status === 'failed')
                  .slice(0, 10)
                  .map((r) => (
                    <li key={r.rowNumber}>
                      Row {r.rowNumber}: {r.message}
                    </li>
                  ))}
              </ul>
            )}
            {outcome.welcomeEmailRequested ? (
              <p className="text-xs text-slate-700">
                Welcome email requested for {outcome.welcomeEmailCount} employee{outcome.welcomeEmailCount === 1 ? '' : 's'} (office and personal email),
                the same way as when you add an employee by hand. Whether it arrives depends on the mail server. Skipped and failed rows get no email.
              </p>
            ) : (
              <p className="text-xs text-amber-700">
                No welcome email was sent. These employees cannot sign in until they get their sign-in details.
              </p>
            )}
            <p className="text-xs text-slate-500">The report lists every row with its new Employee ID, whether the welcome email was requested, or the reason it was skipped or failed.</p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => downloadReport(outcome.rows)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Download report (CSV)
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/employees')}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
              >
                Back to Employees
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Import another file
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
