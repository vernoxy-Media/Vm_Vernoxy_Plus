import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Loader2,
  
  
  X,
} from 'lucide-react';
import { useSalesImportExportControllerUpload } from '@vernoxy-pulse/api-client';
import { downloadSalesFile } from '../../utils/download';
import { parseApiError } from '../../utils/error';
import type { ImportUploadResponse } from '../../types/sales.types';

export interface Step1UploadProps {
  onUploaded: (data: ImportUploadResponse) => void;
}

export const Step1Upload: React.FC<Step1UploadProps> = ({ onUploaded }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useSalesImportExportControllerUpload();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['.xlsx', '.csv'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(extension)) {
      setErrorMessage('Please upload a valid Excel spreadsheet (.xlsx) or CSV (.csv) file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5 MB limit. Please compress or split the file.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = async (format: 'xlsx' | 'csv') => {
    setIsDownloadingTemplate(true);
    try {
      await downloadSalesFile(`/api/v1/sales/imports/template?format=${format}`);
    } catch (err: unknown) {
      alert('Failed to download template. Please check your connection.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setErrorMessage(null);

    try {
      const response = await uploadMutation.mutateAsync({
        data: {
          file: selectedFile,
        },
      });

      const parsed: ImportUploadResponse =
        (response as unknown as { data?: ImportUploadResponse })?.data ??
        (response as unknown as ImportUploadResponse);

      onUploaded(parsed);
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Failed to upload spreadsheet. Please verify row format.');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-6 space-y-6 max-w-3xl mx-auto">
      <div className="text-center max-w-lg mx-auto space-y-1">
        <h2 className="text-lg font-bold text-gray-900">Upload Companies Spreadsheet</h2>
        <p className="text-xs text-gray-500">
          Import up to 1,000 company records in a single batch. We support Excel (.xlsx) and CSV (.csv).
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Upload Problem</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-primary bg-primary/5 ring-4 ring-primary/20'
            : selectedFile
            ? 'border-emerald-400 bg-emerald-50/20'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {(selectedFile.size / 1024).toFixed(1)} KB • Ready for matching
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline font-medium mt-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Remove file</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                Drag and drop your spreadsheet here
              </p>
              <p className="text-xs text-gray-500 mt-1">or browse files from your computer</p>
            </div>
            <div className="text-2xs text-gray-400 flex items-center gap-2">
              <span>Supports .xlsx and .csv</span>
              <span>•</span>
              <span>Max 5 MB</span>
              <span>•</span>
              <span>Max 1,000 rows</span>
            </div>
          </div>
        )}
      </div>

      {/* Template Download strip */}
      <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <p className="font-semibold text-gray-900">Need the official import template?</p>
          <p className="text-2xs text-gray-500 mt-0.5">
            Pre-configured with all 36 fields, dropdown lists, instructions, and sample rows.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleDownloadTemplate('xlsx')}
            disabled={isDownloadingTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => handleDownloadTemplate('csv')}
            disabled={isDownloadingTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>CSV (.csv)</span>
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={handleUploadSubmit}
          disabled={!selectedFile || uploadMutation.isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm transition-all min-h-[44px]"
        >
          {uploadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Continue to Match Columns</span>
        </button>
      </div>
    </div>
  );
};
