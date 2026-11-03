import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  Lock,
} from 'lucide-react';
import {
  useDocumentTemplatesQuery,
  useGenerateDocumentDraftMutation,
  useFinalizeDocumentDraftMutation,
  useEmployeeDocumentsQuery,
} from '../hooks/use-employee-documents';

interface GenerateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocType?: string;
  startAtStep?: 1 | 2 | 3;
  initialDraftContent?: string;
  employee: {
    emp_id: number;
    name: string;
    joining_date: string;
    salary?: number | null;
    pf?: number | null;
    address?: string | null;
    shift?: string | null;
    probation_period?: string | null;
    reporting_manager_name?: string | null;
    department?: { name: string } | null;
    departments?: Array<{ name: string }> | null;
    role?: { role_name: string } | null;
    status: string;
  };
  onSuccess?: () => void;
}

export const GenerateDocumentModal: React.FC<GenerateDocumentModalProps> = ({
  isOpen,
  onClose,
  initialDocType,
  startAtStep,
  initialDraftContent,
  employee,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(startAtStep || 2);
  const [docType, setDocType] = useState<string>(initialDocType || 'offer_letter');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(undefined);

  const { data: employeeDocs } = useEmployeeDocumentsQuery(employee.emp_id);
  const isOfferLetterAccepted = Boolean(
    employeeDocs?.some(
      (d) => d.document_type === 'offer_letter' && (d.status === 'accepted' || d.status === 'uploaded' || d.status === 'final'),
    ),
  );

  // Exact Offer Letter fields matching BFD Image 1:
  // Name, Designation, Department, Offered CTC, Expected Joining Date, offer valid-till date
  const todayStr = new Date().toISOString().split('T')[0];
  const [candidateName, setCandidateName] = useState<string>(employee.name || '');
  const [designation, setDesignation] = useState<string>(employee.role?.role_name || '');
  const [department, setDepartment] = useState<string>(
    employee.departments?.map((d) => d.name).join(', ') || employee.department?.name || '',
  );
  const [proposedJoiningDate, setProposedJoiningDate] = useState<string>(
    employee.joining_date ? new Date(employee.joining_date).toISOString().split('T')[0] : todayStr,
  );
  const [offerValidTillDate, setOfferValidTillDate] = useState<string>('');
  const [customSalary, setCustomSalary] = useState<number>(employee.salary ? Number(employee.salary) : 0);

  // Draft state
  const [draftContent, setDraftContent] = useState<string>(initialDraftContent || '');
  const [isFinalized, setIsFinalized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetModal = () => {
    const targetDocType = initialDocType || 'offer_letter';
    setDocType(targetDocType);
    setCurrentStep(startAtStep || (targetDocType === 'offer_letter' || targetDocType === 'joining_letter' ? 2 : 1));
    setSelectedTemplateId(undefined);
    setCandidateName(employee.name || '');
    setDesignation(employee.role?.role_name || '');
    setDepartment(employee.departments?.map((d) => d.name).join(', ') || employee.department?.name || '');
    setProposedJoiningDate(
      employee.joining_date ? new Date(employee.joining_date).toISOString().split('T')[0] : todayStr,
    );
    setOfferValidTillDate('');
    setCustomSalary(employee.salary ? Number(employee.salary) : 0);
    setDraftContent(initialDraftContent || '');
    setIsFinalized(false);
    setErrorMessage(null);
  };

  useEffect(() => {
    if (isOpen) {
      resetModal();
    }
  }, [isOpen, initialDocType, startAtStep, initialDraftContent]);

  // Queries & Mutations
  const { data: templates, isLoading: isTemplatesLoading } = useDocumentTemplatesQuery();
  const generateDraftMutation = useGenerateDocumentDraftMutation();
  const finalizeMutation = useFinalizeDocumentDraftMutation();

  const filteredTemplates = templates?.filter((t) => t.document_type === docType) || [];

  useEffect(() => {
    if (filteredTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(filteredTemplates[0].template_id);
    }
  }, [filteredTemplates, selectedTemplateId]);

  if (!isOpen) return null;

  const handleNextToStep2 = () => {
    if (docType === 'joining_letter' && !isOfferLetterAccepted) {
      setErrorMessage('Joining Letter can only be generated after the Offer Letter is Accepted.');
      return;
    }
    setCurrentStep(2);
  };

  const handleGenerateDraft = async () => {
    setErrorMessage(null);
    try {
      const result = await generateDraftMutation.mutateAsync({
        empId: employee.emp_id,
        templateId: selectedTemplateId,
        documentType: docType,
        candidateName: candidateName.trim() || undefined,
        designation: designation.trim() || undefined,
        department: department.trim() || undefined,
        proposedJoiningDate: proposedJoiningDate || undefined,
        offerValidTillDate: offerValidTillDate || undefined,
        customSalary: customSalary || undefined,
      });

      setDraftContent(result.draft_content);
      setCurrentStep(3);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to generate document draft.');
    }
  };

  const handleFinalize = async () => {
    setErrorMessage(null);
    try {
      await finalizeMutation.mutateAsync({
        empId: employee.emp_id,
        documentType: docType,
        finalContent: draftContent,
      });

      setIsFinalized(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to finalize and issue document.');
    }
  };

  const handleDownloadWordDraft = () => {
    const blob = new Blob([draftContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docType}_${employee.name.replace(/\s+/g, '_')}_draft.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {docType === 'offer_letter'
                  ? 'Generate Official Offer Letter'
                  : docType === 'joining_letter'
                  ? 'Generate Official Joining Letter'
                  : 'Generate Company Document'}
              </h3>
              <p className="text-xs text-slate-500">
                Issue official company letters auto-populated with {employee.name}'s details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Navigation */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-center gap-2 sm:gap-6 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 font-bold cursor-pointer transition ${
              currentStep === 1 ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs ${
                currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              1
            </span>
            <span>Select Template</span>
          </button>

          <div className="h-0.5 w-8 bg-slate-200" />

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-2 font-bold cursor-pointer transition ${
              currentStep === 2 ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs ${
                currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <span>Check Details & Values</span>
          </button>

          <div className="h-0.5 w-8 bg-slate-200" />

          <button
            type="button"
            onClick={() => {
              if (draftContent) setCurrentStep(3);
            }}
            disabled={!draftContent}
            className={`flex items-center gap-2 font-bold transition ${
              currentStep === 3 ? 'text-blue-600' : 'text-slate-400'
            } ${!draftContent ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-slate-600'}`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs ${
                currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
            <span>Review & Issue</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Select Template */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Document Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'offer_letter', label: 'Offer Letter' },
                    { id: 'joining_letter', label: 'Joining Letter' },
                    { id: 'nda_signed', label: 'NDA Agreement' },
                    { id: 'experience_letter', label: 'Experience Letter' },
                  ].map((cat) => {
                    const isJoiningLocked = cat.id === 'joining_letter' && !isOfferLetterAccepted;
                    const isExitLocked = cat.id === 'experience_letter' && employee.status !== 'Inactive';
                    const isCardLocked = isJoiningLocked || isExitLocked;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={isCardLocked}
                        onClick={() => {
                          setDocType(cat.id);
                          setSelectedTemplateId(undefined);
                        }}
                        className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-2 transition relative ${
                          docType === cat.id
                            ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        } ${isCardLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <FileText
                          className={`w-4 h-4 ${docType === cat.id ? 'text-blue-600' : 'text-slate-400'}`}
                        />
                        <span className="text-xs font-bold">{cat.label}</span>
                        {isCardLocked && (
                          <div className="absolute top-2 right-2" title={isExitLocked ? 'Available after deactivation' : 'Requires Accepted Offer Letter'}>
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {docType === 'joining_letter' && !isOfferLetterAccepted && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Joining Letter can only be generated after the Offer Letter is Accepted. Upload the accepted copy first.
                  </span>
                </div>
              )}

              {/* Template list */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Available Templates
                </label>
                {isTemplatesLoading ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading templates...</div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 border border-dashed rounded-2xl">
                    No approved template found for this document type.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTemplates.map((t) => (
                      <label
                        key={t.template_id}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                          selectedTemplateId === t.template_id
                            ? 'border-blue-600 bg-blue-50/40'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="document_template"
                            checked={selectedTemplateId === t.template_id}
                            onChange={() => setSelectedTemplateId(t.template_id)}
                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div>
                            <span className="text-sm font-bold block">{t.name}</span>
                            {t.description && <span className="text-xs text-slate-400 block">{t.description}</span>}
                          </div>
                        </div>
                        <span className="text-2xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {t.code}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Exact Fields for Offer Letter or Joining Letter */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {docType === 'offer_letter' ? (
                /* EXACT 6 FIELDS FOR OFFER LETTER (BFD Page 18: Name, Designation, Department, Offered CTC, Expected Joining Date, Offer Valid-Till Date) */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-4 h-4 text-blue-600" />
                        Offer Letter Fields
                      </h4>
                      <p className="text-2xs text-blue-700">
                        The Admin can change values for the letter only; the employee master record is not changed.
                      </p>
                    </div>
                    <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-700">
                      Offer Letter Standard
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Name</label>
                      <input
                        type="text"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="Full Name as per Resume"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Designation</label>
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="Designation"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Department</label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Department"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Offered CTC (₹)</label>
                      <input
                        type="number"
                        value={customSalary}
                        onChange={(e) => setCustomSalary(Number(e.target.value))}
                        placeholder="Total Yearly / Monthly CTC"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Expected Joining Date</label>
                      <input
                        type="date"
                        min={todayStr}
                        value={proposedJoiningDate}
                        onChange={(e) => setProposedJoiningDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Offer Valid-Till Date</label>
                      <input
                        type="date"
                        value={offerValidTillDate}
                        onChange={(e) => setOfferValidTillDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </div>
              ) : docType === 'joining_letter' ? (
                /* EXACT 8 FIELDS FOR JOINING LETTER (BFD Page 18: Name, Emp ID, Designation, Department, Reporting Manager, Joining Date, Shift, Probation) */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-purple-600" />
                        Joining Letter Fields
                      </h4>
                      <p className="text-2xs text-purple-700">
                        Uses the employee record. Correct the master employee record if any value is incorrect.
                      </p>
                    </div>
                    <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-white border border-purple-200 text-purple-700">
                      System Sourced
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-slate-400 font-semibold block text-2xs uppercase">Name</span>
                      <span className="font-bold text-slate-800 text-sm">{employee.name}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-slate-400 font-semibold block text-2xs uppercase">Emp ID</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        EMP-{String(employee.emp_id).padStart(4, '0')}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-slate-400 font-semibold block text-2xs uppercase">Designation</span>
                      <span className="font-semibold text-slate-800">
                        {employee.role?.role_name || designation || 'Executive'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-slate-400 font-semibold block text-2xs uppercase">Department</span>
                      <span className="font-semibold text-slate-800">
                        {employee.departments?.map((d) => d.name).join(', ') || employee.department?.name || department || 'General'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-slate-400 font-semibold block text-2xs uppercase">Reporting Manager</span>
                      <span className="font-semibold text-slate-800">
                        {employee.reporting_manager_name || 'Krishna'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-slate-400 font-semibold block text-2xs uppercase">Joining Date</span>
                      <span className="font-semibold text-slate-800">
                        {employee.joining_date
                          ? new Date(employee.joining_date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-slate-400 font-semibold block text-2xs uppercase">Shift</span>
                      <span className="font-semibold text-slate-800">
                        {employee.shift || 'General Shift (09:30 AM - 06:30 PM)'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-slate-400 font-semibold block text-2xs uppercase">Probation</span>
                      <span className="font-semibold text-slate-800">
                        {employee.probation_period || '3 Months'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : docType === 'nda_signed' || docType.includes('nda') ? (
                /* NDA Agreement Fields */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-indigo-600" />
                        Non-Disclosure Agreement (NDA) Values
                      </h4>
                      <p className="text-2xs text-indigo-700">
                        Auto-populated from employee record. You can review and customize before generating the draft.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Employee Full Name</label>
                      <input
                        type="text"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Designation</label>
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Department</label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Employee Address</label>
                      <input
                        type="text"
                        value={employee.address || 'Surat, Gujarat'}
                        disabled
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 bg-slate-50 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Other general documents */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">Name</label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Review Draft, Inline Edit, Word Download & Finalize / Post */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-2 text-xs text-blue-900 font-medium">
                  <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Draft letter ready. You can edit content directly below before posting, or download Word draft.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Edit Fields</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadWordDraft}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 transition shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Word (.doc)</span>
                  </button>
                </div>
              </div>

              {/* Editable Word-like Document Canvas */}
              <div className="border border-slate-200 rounded-2xl shadow-inner bg-white overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-2xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Document Preview & Text Editor</span>
                  <span>Directly Editable HTML/Text</span>
                </div>
                <textarea
                  rows={14}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  className="w-full p-4 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y leading-relaxed"
                  placeholder="Letter content..."
                />
              </div>

              {isFinalized && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="font-bold block">Document Issued Successfully!</span>
                    <span>The official letter has been posted. Row status is now updated.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              {isFinalized ? 'Close' : 'Cancel'}
            </button>

            {currentStep === 1 && (
              <button
                type="button"
                onClick={handleNextToStep2}
                disabled={docType === 'joining_letter' && !isOfferLetterAccepted}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                <span>Check Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={generateDraftMutation.isPending}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {generateDraftMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Word Draft & Review</span>
              </button>
            )}

            {currentStep === 3 && !isFinalized && (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={finalizeMutation.isPending}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {finalizeMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve & Issue Final Copy</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
