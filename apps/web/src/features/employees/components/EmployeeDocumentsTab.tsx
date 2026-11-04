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
  Trash2,
  X,
  Mail,
  Send,
  ChevronDown,
} from 'lucide-react';
import { getAccessToken } from '@vernoxy-pulse/api-client';
import {
  useEmployeeDocumentsQuery,
  useUploadEmployeeDocumentMutation,
  useToggleEmployeeDocumentMutation,
  useDeclineEmployeeDocumentMutation,
  useAddCustomDocumentMutation,
  useDeleteCustomDocumentMutation,
  useSendDocumentRequestMutation,
  EmployeeDocumentItem,
} from '../hooks/use-employee-documents';
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
  onOpenActivateModal?: () => void;
  onOpenEditProfile?: () => void;
  activationStatus?: {
    can_activate: boolean;
    missing_documents: string[];
    total_required: number;
    completed_required: number;
    is_details_completed?: boolean;
    missing_details?: string[];
  } | null;
}

export const EmployeeDocumentsTab: React.FC<EmployeeDocumentsTabProps> = ({
  employee,
  onOpenActivateModal: _onOpenActivateModal,
  onOpenEditProfile: _onOpenEditProfile,
  activationStatus: _activationStatus,
}) => {
  const { data: documents, isLoading, refetch } = useEmployeeDocumentsQuery(employee.emp_id);
  const uploadMutation = useUploadEmployeeDocumentMutation();
  const toggleMutation = useToggleEmployeeDocumentMutation();
  const declineMutation = useDeclineEmployeeDocumentMutation();
  const addCustomDocMutation = useAddCustomDocumentMutation();
  const deleteCustomDocMutation = useDeleteCustomDocumentMutation();
  const sendDocRequestMutation = useSendDocumentRequestMutation();

  const [isSendRequestModalOpen, setIsSendRequestModalOpen] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [requestStatus, setRequestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [requestFeedbackMsg, setRequestFeedbackMsg] = useState('');

  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocRequired, setNewDocRequired] = useState(false);
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  const [generateModalState, setGenerateModalState] = useState<{
    isOpen: boolean;
    docType?: string;
    startAtStep?: 1 | 2 | 3;
    initialDraftContent?: string;
  }>({
    isOpen: false,
    docType: 'offer_letter',
    startAtStep: 2,
  });
  const [declineConfirmDoc, setDeclineConfirmDoc] = useState<EmployeeDocumentItem | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [selectedDocForUpload, setSelectedDocForUpload] = useState<string | null>(null);
  const [untickDocConfirm, setUntickDocConfirm] = useState<EmployeeDocumentItem | null>(null);
  const [viewingDoc, setViewingDoc] = useState<EmployeeDocumentItem | null>(null);
  const [viewVariant, setViewVariant] = useState<'issued' | 'signed'>('issued');
  const [issuedHtml, setIssuedHtml] = useState<string | null>(null);
  const [isLoadingIssued, setIsLoadingIssued] = useState(false);
  const [openViewMenuDocType, setOpenViewMenuDocType] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.view-menu-container')) {
        setOpenViewMenuDocType(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!viewingDoc) {
      setBlobUrl(null);
      setIssuedHtml(null);
      return;
    }

    const token = getAccessToken();
    let isCancelled = false;

    if (viewVariant === 'issued') {
      setBlobUrl(null);
      if (viewingDoc.draft_content && viewingDoc.draft_content.trim().startsWith('<')) {
        setIssuedHtml(viewingDoc.draft_content);
      } else {
        setIsLoadingIssued(true);
        fetch(`/api/v1/employees/${employee.emp_id}/documents/${viewingDoc.document_type}/issued`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((res) => {
            if (!res.ok) throw new Error('Failed to load issued document');
            return res.json();
          })
          .then((data) => {
            if (!isCancelled) {
              setIssuedHtml(data.html || '<p>No content available.</p>');
            }
          })
          .catch((err) => {
            console.error('Error fetching issued document:', err);
            if (!isCancelled) {
              setIssuedHtml('<p className="text-rose-500">Failed to load issued document content.</p>');
            }
          })
          .finally(() => {
            if (!isCancelled) setIsLoadingIssued(false);
          });
      }
      return;
    }

    // viewVariant === 'signed'
    setIssuedHtml(null);
    const fileUrl =
      viewingDoc.file_url ||
      `/api/v1/employees/${employee.emp_id}/documents/${viewingDoc.document_type}/download?type=signed&inline=true`;
    setIsLoadingFile(true);

    fetch(fileUrl.includes('inline=true') ? fileUrl : `${fileUrl}?inline=true`, {
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
  }, [viewingDoc, viewVariant, employee.emp_id]);

  const handleOpenDocViewer = (doc: EmployeeDocumentItem, variant?: 'issued' | 'signed') => {
    const isDualDoc = doc.document_type === 'offer_letter' || doc.document_type === 'nda_signed';
    const chosenVariant =
      variant ||
      (isDualDoc
        ? doc.status === 'accepted' || doc.status === 'signed' || doc.status === 'uploaded' || Boolean(doc.file_url)
          ? 'signed'
          : 'issued'
        : doc.draft_content
          ? 'issued'
          : 'signed');
    setViewVariant(chosenVariant);
    setViewingDoc(doc);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-500">Loading employee documents...</p>
      </div>
    );
  }

  const isDocComplete = (d: EmployeeDocumentItem) =>
    d.status === 'uploaded' ||
    d.status === 'final' ||
    d.status === 'accepted' ||
    d.status === 'signed' ||
    d.status === 'issued' ||
    Boolean(d.file_url);

  const docs = documents || [];
  const uploadedCount = docs.filter(isDocComplete).length;
  const pendingCount = docs.filter((d) => d.status === 'file_pending' && !d.file_url).length;
  const requiredDocs = docs.filter((d) => d.is_required_for_activation);
  const requiredUploaded = requiredDocs.filter(isDocComplete).length;

  // Agreements (Moved to top as requested)
  const agreementDocs = docs.filter((d) => d.category === 'agreement' || d.document_type === 'nda_signed');
  const givenDocs = docs.filter((d) => d.category === 'given_to_employee');
  // Taken from employee (excluding offer_letter_old and joining_letter_old, including custom added docs)
  const takenDocs = docs.filter(
    (d) =>
      d.document_type !== 'nda_signed' &&
      d.document_type !== 'offer_letter_old' &&
      d.document_type !== 'joining_letter_old' &&
      (d.category === 'taken_from_employee' || d.category === 'other' || d.document_type.startsWith('custom_'))
  );

  // BFD Marker 1: Progress counts only ticked rows: how many already have a file
  const takenTickedCount = takenDocs.filter((d) => d.is_ticked).length;
  const takenUploadedCount = takenDocs.filter((d) => d.is_ticked && (Boolean(d.file_url) || d.status === 'uploaded')).length;
  const takenPercentage = takenTickedCount > 0 ? Math.round((takenUploadedCount / takenTickedCount) * 100) : 0;

  // Pending documents list for candidate email request (BFD Reference Screen 8 Marker 3)
  const pendingForRequest: EmployeeDocumentItem[] = [
    ...agreementDocs,
    ...takenDocs,
  ].filter((doc) => {
    const hasFile = Boolean(doc.file_url) || doc.status === 'uploaded' || doc.status === 'accepted' || doc.status === 'signed';
    if (doc.is_ticked && !hasFile) return true;
    if (doc.is_required_for_activation && !doc.is_ticked && !hasFile) return true;
    return false;
  });

  const handleOpenSendRequestModal = () => {
    const defaultEmail = (employee as any).personal_email || (employee as any).email || (employee as any).office_email || '';
    setRequestEmail(defaultEmail);
    setRequestNotes('');
    setRequestStatus('idle');
    setRequestFeedbackMsg('');
    setIsSendRequestModalOpen(true);
  };

  const handleSendDocumentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail.trim()) {
      setRequestStatus('error');
      setRequestFeedbackMsg('Please enter a recipient email address.');
      return;
    }

    try {
      const res = await sendDocRequestMutation.mutateAsync({
        empId: employee.emp_id,
        email: requestEmail.trim(),
        notes: requestNotes.trim() || undefined,
      });

      setRequestStatus('success');
      setRequestFeedbackMsg(res.message || `Request email successfully sent to ${requestEmail}.`);
    } catch (err: any) {
      setRequestStatus('error');
      setRequestFeedbackMsg(err.detail || err.message || 'Failed to send document request email.');
    }
  };

  const handleAddCustomDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    setIsAddingDoc(true);
    try {
      await addCustomDocMutation.mutateAsync({
        empId: employee.emp_id,
        title: newDocTitle.trim(),
        isRequired: newDocRequired,
      });
      setNewDocTitle('');
      setNewDocRequired(false);
      setIsAddDocModalOpen(false);
      refetch();
    } catch (err: any) {
      alert(err?.message || 'Failed to add document');
    } finally {
      setIsAddingDoc(false);
    }
  };

  const handleDeleteCustomDoc = async (doc: EmployeeDocumentItem) => {
    if (!window.confirm(`Are you sure you want to remove "${doc.title}"?`)) return;
    try {
      await deleteCustomDocMutation.mutateAsync({
        empId: employee.emp_id,
        documentType: doc.document_type,
      });
      refetch();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete document');
    }
  };

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

    // Check size limit: 5MB (BFD Page 11 & 14)
    if (file.size > 5 * 1024 * 1024) {
      alert('Only PDF, JPG or PNG up to 5 MB.');
      return;
    }

    // Check NDA must strictly be a PDF (BFD Page 11 & 13)
    if (selectedDocForUpload.includes('nda')) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        alert('The NDA must be a PDF.');
        return;
      }
    }

    // Check passport photos: JPG or PNG (BFD Page 11)
    if (selectedDocForUpload.includes('passport_photos')) {
      const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(file.name);
      if (!isImg) {
        alert('Passport photos must be a JPG or PNG.');
        return;
      }
    }

    // Check general allowed extensions: PDF, JPG, PNG
    const validExts = /\.(pdf|jpg|jpeg|png)$/i;
    if (!validExts.test(file.name)) {
      alert('Only PDF, JPG or PNG up to 5 MB.');
      return;
    }

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

    // If file is already uploaded, ask confirmation before unticking (BFD Page 11)
    if (doc.is_ticked && (doc.status === 'uploaded' || doc.status === 'final' || doc.file_url)) {
      setUntickDocConfirm(doc);
      return;
    }

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

  const handleConfirmUntick = async () => {
    if (!untickDocConfirm) return;
    try {
      await toggleMutation.mutateAsync({
        empId: employee.emp_id,
        documentType: untickDocConfirm.document_type,
        isTicked: false,
      });
      setUntickDocConfirm(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to untick document');
    }
  };

  const renderStatusBadge = (doc: EmployeeDocumentItem) => {
    const s = (doc.status || '').toLowerCase();
    if (s === 'locked') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Locked</span>
        </span>
      );
    }
    if (s === 'accepted') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Accepted</span>
        </span>
      );
    }
    if (s === 'signed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Signed</span>
        </span>
      );
    }
    if (s === 'issued') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          <span>Issued</span>
        </span>
      );
    }
    if (s === 'draft') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Draft</span>
        </span>
      );
    }
    if (s === 'declined') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>Declined</span>
        </span>
      );
    }
    if (s === 'uploaded' || s === 'final') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Uploaded</span>
        </span>
      );
    }
    if (s === 'file_pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>File pending</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
        <span>{doc.category === 'given_to_employee' ? 'Not generated' : 'Not ticked'}</span>
      </span>
    );
  };

  const renderViewAction = (doc: EmployeeDocumentItem) => {
    const isDualDoc = doc.document_type === 'offer_letter' || doc.document_type === 'nda_signed';
    const hasSignedFile = Boolean(doc.file_url) || doc.status === 'accepted' || doc.status === 'signed' || doc.status === 'uploaded';

    if (isDualDoc && hasSignedFile) {
      const isMenuOpen = openViewMenuDocType === doc.document_type;
      const docLabel = doc.document_type === 'offer_letter' ? 'Offer Letter' : 'NDA';
      return (
        <div className="relative inline-block text-left view-menu-container">
          <button
            type="button"
            onClick={() => setOpenViewMenuDocType(isMenuOpen ? null : doc.document_type)}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-1 rounded cursor-pointer font-semibold"
          >
            <span>View</span>
            <ChevronDown className="w-3 h-3 text-blue-600" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in">
              <div className="px-3 py-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                Select View
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenViewMenuDocType(null);
                  handleOpenDocViewer(doc, 'issued');
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer transition"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>View Issued {docLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenViewMenuDocType(null);
                  handleOpenDocViewer(doc, 'signed');
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 cursor-pointer transition border-t border-slate-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>View Signed Copy</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleOpenDocViewer(doc)}
        className="text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-1 rounded cursor-pointer font-semibold"
      >
        View
      </button>
    );
  };

  const renderDocRow = (doc: EmployeeDocumentItem) => {
    const isLocked = doc.status === 'locked';
    const s = (doc.status || '').toLowerCase();
    const isLetter = doc.category === 'given_to_employee' || doc.document_type === 'nda_signed';
    const isUploaded = s === 'uploaded' || s === 'final' || s === 'accepted' || s === 'signed';
    const isDraft = s === 'draft';
    const isIssued = s === 'issued';
    const isDeclined = s === 'declined';
    const isOfferAccepted = Boolean(
      docs.some((d) => d.document_type === 'offer_letter' && d.status === 'accepted')
    );

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
            <div className="flex flex-col">
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
              {isLetter && (
                <span className="text-[11px] text-slate-400">
                  {doc.document_type === 'offer_letter'
                    ? 'Template: Offer Letter - Standard'
                    : doc.document_type === 'joining_letter'
                      ? 'Template: Joining Letter v1'
                      : doc.document_type === 'nda_signed'
                        ? 'Template: NDA - Employee'
                        : 'Official Template'}
                </span>
              )}
            </div>
          </div>
        </td>

        <td className="py-3.5 px-4 whitespace-nowrap">
          {renderStatusBadge(doc)}
        </td>

        <td className="py-3.5 px-4 text-xs">
          {doc.file_name ? (
            <span
              onClick={() => handleOpenDocViewer(doc)}
              className="font-mono text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 px-2 py-1 rounded-lg border border-slate-200 inline-block max-w-[220px] truncate cursor-pointer transition"
              title={doc.file_name}
            >
              📄 {doc.file_name}
            </span>
          ) : isDraft ? (
            <span
              onClick={() =>
                setGenerateModalState({
                  isOpen: true,
                  docType: doc.document_type,
                  startAtStep: 3,
                  initialDraftContent: doc.draft_content || undefined,
                })
              }
              className="font-mono text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 inline-block max-w-[220px] truncate cursor-pointer transition"
            >
              📝 {doc.document_type}_draft.docx
            </span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>

        <td className="py-3.5 px-4 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-2 text-xs font-semibold">
            {/* OFFER LETTER SPECIAL ACTIONS (BFD Page 18 & Screen 9) */}
            {doc.document_type === 'offer_letter' && (
              <>
                {isDraft && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setGenerateModalState({
                          isOpen: true,
                          docType: 'offer_letter',
                          startAtStep: 3,
                          initialDraftContent: doc.draft_content || undefined,
                        })
                      }
                      className="text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-1 rounded cursor-pointer"
                    >
                      Review
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => handleTriggerUpload(doc.document_type)}
                      className="text-slate-600 hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      Upload final
                    </button>
                  </>
                )}

                {isIssued && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenDocViewer(doc, 'issued')}
                      className="text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-1 rounded cursor-pointer font-semibold"
                    >
                      View
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => handleTriggerUpload('offer_letter')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-2xs cursor-pointer"
                      title="Upload candidate signed copy"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Accepted Offer Letter</span>
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDeclineConfirmDoc(doc);
                        setDeclineReason('');
                      }}
                      className="text-rose-600 hover:text-rose-800 px-1.5 py-1 rounded hover:bg-rose-50 cursor-pointer"
                    >
                      Mark declined
                    </button>
                  </>
                )}

                {s === 'accepted' && (
                  <>
                    {renderViewAction(doc)}
                    <span className="text-slate-300">•</span>
                    <a
                      href={`/api/v1/employees/${employee.emp_id}/documents/${doc.document_type}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-600 hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      Download
                    </a>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => handleTriggerUpload(doc.document_type)}
                      className="text-slate-600 hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      Replace
                    </button>
                  </>
                )}

                {!isUploaded && !isDraft && !isIssued && !isDeclined && (
                  <button
                    type="button"
                    onClick={() =>
                      setGenerateModalState({
                        isOpen: true,
                        docType: 'offer_letter',
                        startAtStep: 2,
                      })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-2xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Generate</span>
                  </button>
                )}

                {isDeclined && (
                  <>
                    <span className="text-2xs font-semibold text-rose-600 italic">Declined</span>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setGenerateModalState({
                          isOpen: true,
                          docType: 'offer_letter',
                          startAtStep: 2,
                        })
                      }
                      className="text-blue-600 hover:text-blue-800 hover:underline text-xs cursor-pointer"
                    >
                      Re-issue
                    </button>
                  </>
                )}
              </>
            )}

            {/* JOINING LETTER SPECIAL ACTIONS (BFD Page 18: Only after Offer Letter is Accepted) */}
            {doc.document_type === 'joining_letter' && (
              <>
                {!isOfferAccepted ? (
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 text-xs font-semibold cursor-not-allowed select-none"
                    title="Joining Letter can only be generated after the Offer Letter is Accepted"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Requires Accepted Offer</span>
                  </div>
                ) : (
                  <>
                    {isDraft && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setGenerateModalState({
                              isOpen: true,
                              docType: 'joining_letter',
                              startAtStep: 3,
                              initialDraftContent: doc.draft_content || undefined,
                            })
                          }
                          className="text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-1 rounded cursor-pointer"
                        >
                          Review
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => handleTriggerUpload(doc.document_type)}
                          className="text-slate-600 hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          Upload final
                        </button>
                      </>
                    )}

                    {(isUploaded || isIssued || Boolean(doc.file_url)) && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenDocViewer(doc)}
                          className="text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-1 rounded cursor-pointer font-semibold"
                        >
                          View
                        </button>
                        <span className="text-slate-300">•</span>
                        <a
                          href={`/api/v1/employees/${employee.emp_id}/documents/${doc.document_type}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          Download
                        </a>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => handleTriggerUpload(doc.document_type)}
                          className="text-slate-600 hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          Replace
                        </button>
                      </>
                    )}

                    {!isUploaded && !isIssued && !Boolean(doc.file_url) && !isDraft && (
                      <button
                        type="button"
                        onClick={() =>
                          setGenerateModalState({
                            isOpen: true,
                            docType: 'joining_letter',
                            startAtStep: 2,
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-2xs transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Generate</span>
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* ALL OTHER DOCUMENTS (NDA, Marksheets, etc.) */}
            {doc.document_type !== 'offer_letter' && doc.document_type !== 'joining_letter' && (
              <>
                {isDraft && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenDocViewer(doc, 'issued')}
                      className="text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-1 rounded cursor-pointer"
                    >
                      Review
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => handleTriggerUpload(doc.document_type)}
                      className="text-slate-600 hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      Upload final
                    </button>
                  </>
                )}

                {/* NDA Issued: Show View + Download + Upload Signed NDA */}
                {isIssued && doc.document_type === 'nda_signed' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenDocViewer(doc, 'issued')}
                      className="text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-1 rounded cursor-pointer font-semibold"
                    >
                      View
                    </button>
                    <span className="text-slate-300">•</span>
                    <a
                      href={`/api/v1/employees/${employee.emp_id}/documents/${doc.document_type}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-600 hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      Download
                    </a>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => handleTriggerUpload(doc.document_type)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-2xs cursor-pointer"
                      title="Upload employee signed NDA copy"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Signed NDA</span>
                    </button>
                  </>
                )}

                {/* For other uploaded documents, or NDA after being accepted/uploaded */}
                {!(isIssued && doc.document_type === 'nda_signed') && (isUploaded || Boolean(doc.file_url)) && (
                  <>
                    {renderViewAction(doc)}
                    <span className="text-slate-300">•</span>
                    <a
                      href={`/api/v1/employees/${employee.emp_id}/documents/${doc.document_type}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-600 hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      Download
                    </a>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => handleTriggerUpload(doc.document_type)}
                      className="text-slate-600 hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      Replace
                    </button>
                  </>
                )}

                {!isUploaded && !isDraft && !isIssued && isLetter && !isLocked && (
                  <button
                    type="button"
                    onClick={() =>
                      setGenerateModalState({
                        isOpen: true,
                        docType: doc.document_type,
                        startAtStep: 1,
                      })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-2xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Generate</span>
                  </button>
                )}

                {!isUploaded && !isDraft && !isLetter && !isLocked && (
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
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold border border-slate-200">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Locked (Post-deactivation)</span>
                  </span>
                )}
              </>
            )}

            {doc.document_type.startsWith('custom_') && (
              <>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => handleDeleteCustomDoc(doc)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                  title="Remove document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
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
              {/* GROUP 1: AGREEMENT (NDA at the top) */}
              {agreementDocs.length > 0 && (
                <>
                  <tr className="bg-slate-100/60 border-b border-slate-200">
                    <td colSpan={4} className="py-2 px-4 text-2xs font-bold uppercase tracking-wider text-slate-600">
                      Agreement
                    </td>
                  </tr>
                  {agreementDocs.map(renderDocRow)}
                </>
              )}

              {/* GROUP 2: GIVEN TO THE EMPLOYEE (Below NDA) */}
              {givenDocs.length > 0 && (
                <>
                  <tr className="bg-slate-100/60 border-t border-b border-slate-200">
                    <td colSpan={4} className="py-2 px-4 text-2xs font-bold uppercase tracking-wider text-slate-600">
                      Given to the employee
                    </td>
                  </tr>
                  {givenDocs.map(renderDocRow)}
                </>
              )}

              {/* GROUP 3: TAKEN FROM THE EMPLOYEE (BFD Reference Screen 8) */}
              <tr className="bg-slate-100/60 border-t border-b border-slate-200">
                <td colSpan={4} className="py-2.5 px-4 text-2xs font-bold uppercase tracking-wider text-slate-600">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span>Documents we take from the employee</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Marker 1: Progress - Counts only ticked rows */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 normal-case font-mono">
                          {takenUploadedCount} of {takenTickedCount} uploaded
                        </span>
                        <div className="w-20 sm:w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${takenPercentage}%` }}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddDocModalOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition normal-case cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Document</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              {takenDocs.map(renderDocRow)}

              {/* Marker 2: Add other document & Marker 3: Send document request to candidate */}
              <tr className="border-b border-slate-100 bg-slate-50/40 hover:bg-slate-50/70 transition-colors">
                <td colSpan={4} className="py-3 px-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddDocModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add other document</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenSendRequestModal}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold shadow-2xs transition cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>Send document request to candidate</span>
                      {pendingForRequest.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black font-mono">
                          {pendingForRequest.length}
                        </span>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Custom Document Modal */}
      {isAddDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Add Document</h3>
                <p className="text-xs text-slate-500">Add an additional document requirement for this employee</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDocModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomDoc} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Document Name / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g. Previous Company Form 16, Electricity Bill, Passport"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newDocRequired}
                    onChange={(e) => setNewDocRequired(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Required before activation</span>
                </label>
                <p className="text-[11px] text-slate-400 ml-5 mt-0.5">
                  If checked, account activation will require this document to be uploaded.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDocModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingDoc || !newDocTitle.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAddingDoc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Add Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Generation / Review Modal */}
      <GenerateDocumentModal
        isOpen={generateModalState.isOpen}
        onClose={() => setGenerateModalState((prev) => ({ ...prev, isOpen: false }))}
        initialDocType={generateModalState.docType}
        startAtStep={generateModalState.startAtStep}
        initialDraftContent={generateModalState.initialDraftContent}
        employee={employee}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Document View / Preview Modal */}
      {viewingDoc && (() => {
        const isDualDoc = viewingDoc.document_type === 'offer_letter' || viewingDoc.document_type === 'nda_signed';
        const hasBothCopies =
          isDualDoc &&
          (Boolean(viewingDoc.file_url) ||
            viewingDoc.status === 'accepted' ||
            viewingDoc.status === 'signed' ||
            viewingDoc.status === 'uploaded');
        const isHtmlDraft = viewVariant === 'issued';
        const fileNameLower = (viewingDoc.file_name || '').toLowerCase();
        const isImage =
          !isHtmlDraft &&
          (viewingDoc.mime_type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileNameLower));
        const isPdf =
          !isHtmlDraft &&
          (viewingDoc.mime_type === 'application/pdf' || /\.pdf$/i.test(fileNameLower));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h4 className="font-bold text-slate-900 text-sm">{viewingDoc.title}</h4>
                  </div>

                  {hasBothCopies && (
                    <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setViewVariant('issued')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          viewVariant === 'issued'
                            ? 'bg-white text-blue-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Issued Letter</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewVariant('signed')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          viewVariant === 'signed'
                            ? 'bg-white text-emerald-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Signed Copy</span>
                      </button>
                    </div>
                  )}

                  {viewVariant === 'signed' && viewingDoc.file_name && (
                    <span className="text-2xs font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {viewingDoc.file_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {viewVariant === 'issued' ? (
                    <>
                      <a
                        href={`/api/v1/employees/${employee.emp_id}/documents/${viewingDoc.document_type}/download?type=issued&inline=true`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-slate-100"
                        title="Open in new window"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Window</span>
                      </a>
                      <a
                        href={`/api/v1/employees/${employee.emp_id}/documents/${viewingDoc.document_type}/download?type=issued`}
                        download={`${viewingDoc.document_type}_issued.html`}
                        className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-semibold px-2 py-1 rounded hover:bg-slate-100"
                        title="Download issued document"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </>
                  ) : blobUrl ? (
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
                  ) : null}

                  <button
                    onClick={() => {
                      setViewingDoc(null);
                      setBlobUrl(null);
                      setIssuedHtml(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-sm font-bold ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center min-h-[300px]">
                {viewVariant === 'issued' ? (
                  isLoadingIssued ? (
                    <div className="text-center py-12 space-y-3">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                      <p className="text-xs text-slate-500 font-medium">Loading issued document...</p>
                    </div>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none p-6 rounded-2xl border border-slate-200 bg-white shadow-inner w-full"
                      dangerouslySetInnerHTML={{
                        __html: issuedHtml || viewingDoc.draft_content || '<p>No content available</p>',
                      }}
                    />
                  )
                ) : isLoadingFile ? (
                  <div className="text-center py-12 space-y-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">Loading document preview...</p>
                  </div>
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
      {/* Untick confirmation popup (BFD Page 11) */}
      {untickDocConfirm && (
        <div
          id="untick-doc-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Remove Uploaded Document?</h3>
            <p className="text-sm text-slate-600">
              The uploaded file will be removed. Continue?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="untick-doc-cancel-btn"
                onClick={() => setUntickDocConfirm(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="untick-doc-confirm-btn"
                onClick={handleConfirmUntick}
                className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 transition cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Decline offer modal (BFD Image 1: Admin marks employee "Did not join", onboarding stops) */}
      {declineConfirmDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Mark Offer Letter as Declined</h3>
            <p className="text-xs text-slate-500">
              The candidate has declined the offer. Enter the decline reason. Onboarding will stop and record will be marked as "Did not join".
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Decline Reason *</label>
              <textarea
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Candidate accepted another offer with higher compensation..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeclineConfirmDoc(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={declineMutation.isPending}
                onClick={async () => {
                  if (!declineConfirmDoc) return;
                  await declineMutation.mutateAsync({
                    empId: employee.emp_id,
                    documentType: declineConfirmDoc.document_type,
                    reason: declineReason || 'Candidate declined the offer',
                  });
                  setDeclineConfirmDoc(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
              >
                {declineMutation.isPending ? 'Marking...' : 'Confirm Declined'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Document Request to Candidate Modal (BFD Reference Screen 8 Marker 3) */}
      {isSendRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Send Document Request</h3>
                  <p className="text-xs text-slate-500">Email the candidate a checklist of pending documents</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSendRequestModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {requestStatus === 'success' ? (
              <div className="py-6 space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">Request Email Sent!</h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">{requestFeedbackMsg}</p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSendRequestModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendDocumentRequest} className="space-y-4">
                {requestStatus === 'error' && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{requestFeedbackMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Candidate / Recipient Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={requestEmail}
                    onChange={(e) => setRequestEmail(e.target.value)}
                    placeholder="candidate@example.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Defaults to candidate's personal email on record. You can change this if needed.
                  </p>
                </div>

                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Documents to Request ({pendingForRequest.length})
                  </label>
                  {pendingForRequest.length === 0 ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                      All requested documents have already been uploaded.
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                      {pendingForRequest.map((doc, idx) => (
                        <div key={idx} className="p-2.5 text-xs flex items-center justify-between">
                          <span className="font-semibold text-slate-700">{doc.title}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${doc.is_required_for_activation
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-200 text-slate-700'
                              }`}
                          >
                            {doc.is_required_for_activation ? 'Required' : 'Pending File'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Optional Note for Candidate
                  </label>
                  <textarea
                    rows={2}
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="e.g. Please bring original physical copies on your joining date as well."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSendRequestModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendDocRequestMutation.isPending || pendingForRequest.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {sendDocRequestMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Request Email</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
