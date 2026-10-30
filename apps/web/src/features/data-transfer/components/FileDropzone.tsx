import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, X, AlertCircle } from 'lucide-react';

export interface FileDropzoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  error?: string | null;
  maxSizeBytes?: number;
  accept?: string[];
  disabled?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  file,
  onFileSelect,
  error: externalError,
  maxSizeBytes = 10 * 1024 * 1024,
  accept = ['.xlsx', '.csv'],
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const displayError = externalError || internalError;

  const validateAndSelect = (candidate: File | null) => {
    setInternalError(null);
    if (!candidate) {
      onFileSelect(null);
      return;
    }

    const ext = `.${candidate.name.split('.').pop()?.toLowerCase()}`;
    if (!accept.includes(ext)) {
      setInternalError(`Invalid file format. Please upload an ${accept.join(' or ')} file.`);
      return;
    }

    if (candidate.size > maxSizeBytes) {
      const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
      setInternalError(`File size exceeds ${maxMb}MB limit.`);
      return;
    }

    onFileSelect(candidate);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const droppedFile = e.dataTransfer.files?.[0] || null;
    validateAndSelect(droppedFile);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        disabled={disabled}
        className="hidden"
        onChange={(e) => validateAndSelect(e.target.files?.[0] || null)}
      />

      {!file ? (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload spreadsheet file"
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 ${
            disabled
              ? 'opacity-60 bg-gray-50 border-gray-200 cursor-not-allowed'
              : isDragOver
              ? 'border-indigo-500 bg-indigo-50/50 scale-[1.005]'
              : 'border-gray-300 hover:border-indigo-400 bg-gray-50/50 hover:bg-white'
          }`}
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3">
            <UploadCloud className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            Supports XLSX or CSV (max 10MB)
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => validateAndSelect(null)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove file"
            aria-label="Remove file"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {displayError && (
        <div className="flex items-center gap-2 mt-2 text-xs text-red-600 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
};
