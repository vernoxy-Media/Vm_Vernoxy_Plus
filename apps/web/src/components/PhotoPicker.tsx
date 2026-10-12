import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Trash2, X } from 'lucide-react';
import { Avatar } from './Avatar';

interface PhotoPickerProps {
  currentPhotoUrl?: string | null;
  employeeName?: string;
  selectedFile?: File | null;
  onFileSelect?: (file: File | null, previewUrl: string | null) => void;
  // For Edit mode where it directly uploads/removes
  onUploadImmediate?: (file: File) => Promise<void>;
  onRemoveImmediate?: () => Promise<void>;
  disabled?: boolean;
}

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  currentPhotoUrl,
  employeeName = 'Employee',
  selectedFile,
  onFileSelect,
  onUploadImmediate,
  onRemoveImmediate,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setLocalPreview(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setLocalPreview(null);
    }
  }, [selectedFile]);

  const activePhotoUrl = localPreview || currentPhotoUrl || null;

  const validateAndHandleFile = async (file: File) => {
    setError(null);

    // 1. Check size: max 5MB (5 * 1024 * 1024 bytes)
    if (file.size > 5242880) {
      setError('File size exceeds 5 MB limit. Please select a smaller photo.');
      return;
    }

    // 2. Check type: only JPEG and PNG allowed
    const validMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validMimes.includes(file.type)) {
      setError('Invalid file type. Only PNG and JPG formats are supported.');
      return;
    }

    if (onUploadImmediate) {
      // Immediate save in edit page
      setIsProcessing(true);
      try {
        await onUploadImmediate(file);
      } catch (err: any) {
        setError(err.message || 'Failed to upload photo. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    } else if (onFileSelect) {
      // Create flow form state
      const url = URL.createObjectURL(file);
      onFileSelect(file, url);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndHandleFile(file);
    }
    // reset input so the same file could be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setError(null);
    if (onRemoveImmediate) {
      setIsProcessing(true);
      try {
        await onRemoveImmediate();
      } catch (err: any) {
        setError(err.message || 'Failed to remove photo.');
      } finally {
        setIsProcessing(false);
      }
    } else if (onFileSelect) {
      onFileSelect(null, null);
    }
  };

  const triggerUploadClick = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
      {/* 112px square preview box */}
      <div className="relative group shrink-0">
        <div
          className="w-28 h-28 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shadow-sm"
          style={{ width: 112, height: 112 }}
        >
          {activePhotoUrl ? (
            <img
              src={activePhotoUrl}
              alt={employeeName}
              width={112}
              height={112}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 text-3xl font-bold">
              <Avatar name={employeeName} size={112} className="w-full h-full rounded-2xl" />
            </div>
          )}
        </div>

        {/* Camera icon button on corner */}
        <button
          type="button"
          onClick={triggerUploadClick}
          disabled={disabled || isProcessing}
          aria-label="Upload photo"
          id="photo-picker-camera-button"
          className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-700 hover:text-blue-600 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      {/* Info & action buttons */}
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">Upload Photo</p>
          <p className="text-xs text-gray-500 mt-0.5">PNG, JPG up to 5 MB</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1">
          <button
            type="button"
            id="photo-picker-upload-button"
            onClick={triggerUploadClick}
            disabled={disabled || isProcessing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            {activePhotoUrl ? 'Change' : 'Upload'}
          </button>

          {activePhotoUrl && (
            <button
              type="button"
              id="photo-picker-remove-button"
              onClick={handleRemove}
              disabled={disabled || isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-500" />
              Remove
            </button>
          )}

          {localPreview && !currentPhotoUrl && (
            <button
              type="button"
              onClick={() => onFileSelect?.(null, null)}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          id="photo-file-input"
          aria-label="Choose profile photo"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled || isProcessing}
        />

        {/* Aria-live inline error message */}
        <div aria-live="polite" className="min-h-[1.25rem]">
          {error && (
            <p className="text-xs text-red-600 font-medium animate-fadeIn">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
};
