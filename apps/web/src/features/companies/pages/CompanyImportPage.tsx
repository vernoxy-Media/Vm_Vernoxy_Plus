import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  ArrowLeft,
  History,
  RotateCcw,
} from 'lucide-react';
import { customFetch, getAccessToken } from '@vernoxy-pulse/api-client';
import { useAuthenticatedDownload } from '../../../hooks/use-authenticated-download';
import { ImportSummary } from '../../../components/ImportSummary';
import { JobProgress } from '../../../components/JobProgress';
import { ImportHistoryModal } from '../components/ImportHistoryModal';
import { ImportUploadSection } from '../components/ImportUploadSection';
import { ImportReviewSection } from '../components/ImportReviewSection';

export const CompanyImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { download, isDownloading } = useAuthenticatedDownload();

  const [file, setFile] = useState<File | null>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip_duplicates' | 'import_anyway'>('skip_duplicates');
  const [skipInvalidRows, setSkipInvalidRows] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<any | null>(null);

  const [isConfirming, setIsConfirming] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const handlePreview = async () => {
    if (!file) return;
    setIsPreviewing(true);
    setPreviewError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('duplicate_policy', duplicatePolicy);
    formData.append('skip_invalid_rows', String(skipInvalidRows));

    try {
      const token = getAccessToken();
      const res = await fetch('/api/v1/companies/import/preview', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        let msg = `Preview failed (${res.status})`;
        try {
          const errData = await res.json();
          if (errData.detail) msg = errData.detail;
          else if (errData.message) msg = errData.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const data = await res.json();
      setPreviewResult(data);
      setJobId(data.job_id);
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to inspect spreadsheet');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    if (!jobId) return;
    setIsConfirming(true);

    try {
      await customFetch(`/api/v1/companies/import/${jobId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duplicate_policy: duplicatePolicy,
          skip_invalid_rows: skipInvalidRows,
        }),
      });

      setJobStatus({
        status: 'queued',
        counts: {
          total: previewResult?.totals?.total_rows || 0,
          valid: 0,
          processed: 0,
          created: 0,
          skipped: 0,
          failed: 0,
          errors: 0,
          warnings: 0,
        },
        percentage: 0,
        has_report: false,
        error_message: null,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to start import job');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelJob = async () => {
    if (!jobId) return;
    setIsCanceling(true);
    try {
      await customFetch(`/api/v1/companies/import/${jobId}/cancel`, { method: 'POST' });
    } catch (err: any) {
      alert(err.message || 'Failed to cancel job');
    } finally {
      setIsCanceling(false);
    }
  };

  useEffect(() => {
    if (!jobId || !jobStatus) return;
    if (['completed', 'completed_with_errors', 'failed', 'cancelled'].includes(jobStatus.status)) return;

    const interval = setInterval(async () => {
      try {
        const latest = await customFetch<any>(`/api/v1/companies/import/${jobId}`);
        setJobStatus(latest);
      } catch {
        // ignore
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobId, jobStatus?.status]);

  const resetAll = () => {
    setFile(null);
    setPreviewResult(null);
    setJobId(null);
    setJobStatus(null);
    setPreviewError(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/companies')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Import Companies</h1>
            <p className="text-sm text-slate-500 mt-1">
              Bulk create companies, communication channels, and contacts via spreadsheet.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <History className="w-4 h-4 text-slate-500" />
          Import History
        </button>
      </div>

      {/* Stage 1: Download Template */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">1. Download Import Template</h2>
          <p className="text-sm text-slate-500 mt-1">Use pre-formatted templates with instructions and validation dropdowns.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isDownloading}
            onClick={() => download('/api/v1/companies/import/template?format=xlsx', 'company-import-template.xlsx')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Excel (.xlsx)
          </button>
          <button
            type="button"
            disabled={isDownloading}
            onClick={() => download('/api/v1/companies/import/template?format=csv', 'company-import-template.csv')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> CSV (.csv)
          </button>
        </div>
      </div>

      {/* Stage 2: Upload File & Options */}
      {!jobStatus && (
        <ImportUploadSection
          file={file}
          onFileSelect={(f) => { setFile(f); setPreviewResult(null); setPreviewError(null); }}
          duplicatePolicy={duplicatePolicy}
          onDuplicatePolicyChange={setDuplicatePolicy}
          skipInvalidRows={skipInvalidRows}
          onSkipInvalidRowsChange={setSkipInvalidRows}
          onPreview={handlePreview}
          isPreviewing={isPreviewing}
          previewError={previewError}
        />
      )}

      {/* Stage 3: Review Preview Summary */}
      {!jobStatus && previewResult && (
        <ImportReviewSection
          previewResult={previewResult}
          isConfirming={isConfirming}
          onConfirm={handleConfirm}
          onReset={resetAll}
        />
      )}

      {/* Stage 4: Job Progress & Final Results */}
      {jobStatus && (
        <div className="space-y-5">
          <JobProgress
            status={jobStatus.status}
            percentage={jobStatus.percentage || 0}
            processed={jobStatus.counts?.processed || 0}
            total={jobStatus.counts?.total || 0}
            errorMessage={jobStatus.error_message}
            onCancel={handleCancelJob}
            isCanceling={isCanceling}
          />

          {['completed', 'completed_with_errors'].includes(jobStatus.status) && (
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Final Results</h3>
              <ImportSummary
                mode="result"
                total={jobStatus.counts?.total || 0}
                created={jobStatus.counts?.created || 0}
                skipped={jobStatus.counts?.skipped || 0}
                warnings={jobStatus.counts?.warnings || 0}
                errors={jobStatus.counts?.failed || 0}
              />

              <div className="flex items-center gap-3 pt-2">
                {jobStatus.has_report && (
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => download(`/api/v1/companies/import/${jobId}/report`, `import-report-${jobId?.slice(0, 8)}.csv`)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    Download Import Report (CSV)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/companies')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Back to Companies List
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Import Another File
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ImportHistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
};
