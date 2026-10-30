import React, { useRef, useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Lock,
  Download,
  Plus,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { getAccessToken } from '@vernoxy-pulse/api-client';
import {
  useEmployeeDocumentsQuery,
  useUploadEmployeeDocumentMutation,
  useToggleEmployeeDocumentMutation,
  EmployeeDocumentItem,
} from '../../hooks/use-employee-documents';
import { GenerateDocumentModal } from './GenerateDocumentModal';

interface EmployeeDocumentsTabProps {
  employee: {
    emp_id: number;
    name: string;
    joining_date: string;
    salary?: number | null;
    pf?: number | null;
    address?: string | null;
    department?: { name: string } | null;
    departments?: Array<{ name: string }> | null;
    role?: { role_name: string } | null;
    status: string;
  };
}

export const EmployeeDocumentsTab: React.FC<EmployeeDocumentsTabProps> = ({ employee }) => {
  const { data: documents, isLoading, refetch } = useEmployeeDocumentsQuery(employee.emp_id);
  const uploadMutation = useUploadEmployeeDocumentMutation();
  const toggleMutation = useToggleEmployeeDocumentMutation();

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedDocForUpload, setSelectedDocForUpload] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<EmployeeDocumentItem | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!viewingDoc || !viewingDoc.file_url) {
      setBlobUrl(null);
      return;
    }
    // If it's an HTML draft letter, no need to fetch file
    if (viewingDoc.draft_content && viewingDoc.draft_content.trim().startsWith('<')) {
      setBlobUrl(null);
      return;
    }

    setIsLoadingFile(true);
    const token = getAccessToken();
    let isCancelled = false;

    fetch(`${viewingDoc.file_url}?inline=true`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load file');
        return res.blob();
      })
      .then((blob) => {
        if (!isCancelled) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      })
      .catch((err) => {
        console.error('Error fetching preview:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingFile(false);
      });

    return () => {
      isCancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [viewingDoc]);

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-500">Loading employee documents...</p>
      </div>
    );
  }

  const docs = documents || [];
  const uploadedCount = docs.filter((d) => d.status === 'uploaded' || d.status === 'final').length;
  const pendingCount = docs.filter((d) => d.status === 'file_pending').length;
  const requiredDocs = docs.filter((d) => d.is_required_for_activation);
  const requiredUploaded = requiredDocs.filter((d) => d.status === 'uploaded' || d.status === 'final').length;

  const givenDocs = docs.filter((d) => d.category === 'given_to_employee');
  const takenDocs = docs.filter((d) => d.category === 'taken_from_employee');
  const agreementDocs = docs.filter((d) => d.category === 'agreement');

  const handleTriggerUpload = (docType: string) => {
    setSelectedDocForUpload(docType);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDocForUpload) return;

    try {
      await uploadMutation.mutateAsync({
        empId: employee.emp_id,
        documentType: selectedDocForUpload,
        file,
      });
      setSelectedDocForUpload(null);
    } catch (err: any) {
      alert(err?.message || 'File upload failed');
    }
  };

  const handleToggle = async (doc: EmployeeDocumentItem) => {
    if (doc.status === 'locked') return;
    try {
      await toggleMutation.mutateAsync({
        empId: employee.emp_id,
        documentType: doc.document_type,
        isTicked: !doc.is_ticked,
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle document');
    }
  };

  const renderStatusBadge = (doc: EmployeeDocumentItem) => {
    if (doc.status === 'locked') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Locked</span>
        </span>
      );
    }
    if (doc.status === 'uploaded' || doc.status === 'final') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Uploaded</span>
        </span>
      );
    }
    if (doc.status === 'file_pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>File pending</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
        <span>Not ticked</span>
      </span>
    );
  };

  const renderDocRow = (doc: EmployeeDocumentItem) => {
    const isLocked = doc.status === 'locked';
    const isUploaded = doc.status === 'uploaded' || doc.status === 'final';

    return (
      <tr key={doc.doc_id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-b-0">
        <td className="py-3.5 px-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={doc.is_ticked}
              disabled={isLocked}
              onChange={() => handleToggle(doc)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40 cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${isLocked ? 'text-slate-400' : 'text-slate-800'}`}>
                {doc.title}
              </span>
              {doc.is_required_for_activation && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/70 tracking-wide">
                  Required *
                </span>
              )}
            </div>
          </div>
        </td>

        <td className="py-3.5 px-4 whitespace-nowrap">
          {renderStatusBadge(doc)}
        </td>

        <td className="py-3.5 px-4 text-xs">
          {isUploaded && doc.file_name ? (
            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 inline-block max-w-[220px] truncate" title={doc.file_name}>
              {doc.file_name}
            </span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>

        <td className="py-3.5 px-4 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-2 text-xs font-semibold">
            {isUploaded && (
              <>
                <button
                  type="button"
                  onClick={() => setViewingDoc(doc)}
                  className="text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-1 rounded cursor-pointer"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerUpload(doc.document_type)}
                  className="text-slate-600 hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer"
                >
                  Replace
                </button>
              </>
            )}

            {!isUploaded && !isLocked && (
              <button
                type="button"
                onClick={() => handleTriggerUpload(doc.document_type)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            )}

            {isLocked && (
              <span className="text-2xs text-slate-400 italic">Opens after deactivation</span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
      />

      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Metric Cards (Reference Screen 3) */}
        <div className="flex flex-wrap items-center gap-4">
          {employee.status === 'Onboarding' && (
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-purple-50/80 border border-purple-200/80 shadow-2xs">
              <div className="p-2 rounded-xl bg-purple-600 text-white">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-black text-purple-950 font-mono">
                  {requiredUploaded} / {requiredDocs.length}
                </div>
                <div className="text-2xs font-semibold text-purple-700 uppercase tracking-wider">
                  Required for Activation
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 shadow-2xs">
            <div className="p-2 rounded-xl bg-emerald-500 text-white">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-emerald-950 font-mono">{uploadedCount} uploaded</div>
              <div className="text-2xs font-semibold text-emerald-700 uppercase tracking-wider">Total files saved</div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-2xs">
            <div className="p-2 rounded-xl bg-amber-500 text-white">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-amber-950 font-mono">{pendingCount} pending</div>
              <div className="text-2xs font-semibold text-amber-700 uppercase tracking-wider">Ticked, file missing</div>
            </div>
          </div>
        </div>

        {/* Generate Document Action Button (Marker 4) */}
        <button
          type="button"
          onClick={() => setIsGenerateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Generate Document</span>
        </button>
      </div>

      {/* Main Documents Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-2xs font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">File</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {/* GROUP 1: GIVEN TO THE EMPLOYEE */}
              <tr className="bg-slate-100/60 border-b border-slate-200">
                <td colSpan={4} className="py-2 px-4 text-2xs font-bold uppercase tracking-wider text-slate-600">
                  Given to the employee
                </td>
              </tr>
              {givenDocs.map(renderDocRow)}

              {/* GROUP 2: TAKEN FROM THE EMPLOYEE */}
              <tr className="bg-slate-100/60 border-t border-b border-slate-200">
                <td colSpan={4} className="py-2 px-4 text-2xs font-bold uppercase tracking-wider text-slate-600">
                  Taken from the employee
                </td>
              </tr>
              {takenDocs.map(renderDocRow)}

              {/* GROUP 3: AGREEMENT */}
              <tr className="bg-slate-100/60 border-t border-b border-slate-200">
                <td colSpan={4} className="py-2 px-4 text-2xs font-bold uppercase tracking-wider text-slate-600">
                  Agreement
                </td>
              </tr>
              {agreementDocs.map(renderDocRow)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Generation Modal */}
      <GenerateDocumentModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        employee={employee}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Document View / Preview Modal */}
      {viewingDoc && (() => {
        const isHtmlDraft = Boolean(viewingDoc.draft_content && viewingDoc.draft_content.trim().startsWith('<'));
        const fileNameLower = (viewingDoc.file_name || '').toLowerCase();
        const isImage = !isHtmlDraft && (
          viewingDoc.mime_type?.startsWith('image/') ||
          /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileNameLower)
        );
        const isPdf = !isHtmlDraft && (
          viewingDoc.mime_type === 'application/pdf' ||
          /\.pdf$/i.test(fileNameLower)
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-slate-900 text-sm">{viewingDoc.title}</h4>
                  {viewingDoc.file_name && (
                    <span className="text-2xs font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {viewingDoc.file_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {blobUrl && (
                    <>
                      <a
                        href={blobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-slate-100"
                        title="Open in new window"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Window</span>
                      </a>
                      <a
                        href={blobUrl}
                        download={viewingDoc.file_name || `${viewingDoc.document_type}.pdf`}
                        className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-semibold px-2 py-1 rounded hover:bg-slate-100"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setViewingDoc(null);
                      setBlobUrl(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-sm font-bold ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center min-h-[300px]">
                {isLoadingFile ? (
                  <div className="text-center py-12 space-y-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">Loading document preview...</p>
                  </div>
                ) : isHtmlDraft ? (
                  <div
                    className="prose prose-sm max-w-none p-6 rounded-2xl border border-slate-200 bg-white shadow-inner w-full"
                    dangerouslySetInnerHTML={{ __html: viewingDoc.draft_content! }}
                  />
                ) : isImage && blobUrl ? (
                  <div className="w-full flex justify-center p-3 bg-slate-50/60 rounded-2xl border border-slate-100">
                    <img
                      src={blobUrl}
                      alt={viewingDoc.title}
                      className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-xs"
                    />
                  </div>
                ) : isPdf && blobUrl ? (
                  <iframe
                    src={blobUrl}
                    className="w-full h-[72vh] rounded-2xl border border-slate-200 shadow-xs"
                    title={viewingDoc.title}
                  />
                ) : blobUrl ? (
                  <div className="text-center py-12 space-y-4">
                    <FileText className="w-12 h-12 text-blue-500 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">{viewingDoc.file_name}</p>
                    <p className="text-xs text-slate-400">Preview not available for this file type.</p>
                    <a
                      href={blobUrl}
                      download={viewingDoc.file_name || `${viewingDoc.document_type}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File</span>
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-slate-400">
                    No document content available to preview.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
