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
} from 'lucide-react';
import {
  useDocumentTemplatesQuery,
  useGenerateDocumentDraftMutation,
  useFinalizeDocumentDraftMutation,
} from '../hooks/use-employee-documents';

interface GenerateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  onSuccess?: () => void;
}

export const GenerateDocumentModal: React.FC<GenerateDocumentModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [docType, setDocType] = useState<string>('offer_letter');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(undefined);

  // Document-specific inputs
  const todayStr = new Date().toISOString().split('T')[0];
  const [proposedJoiningDate, setProposedJoiningDate] = useState<string>(
    employee.joining_date ? new Date(employee.joining_date).toISOString().split('T')[0] : todayStr,
  );
  const [customSalary, setCustomSalary] = useState<number>(employee.salary ? Number(employee.salary) : 0);
  const [customPf, setCustomPf] = useState<number>(employee.pf ? Number(employee.pf) : 0);
  const [docNotes, setDocNotes] = useState<string>('');

  // Draft state
  const [draftContent, setDraftContent] = useState<string>('');
  const [isFinalized, setIsFinalized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setCurrentStep(2);
  };

  const handleGenerateDraft = async () => {
    setErrorMessage(null);
    try {
      const result = await generateDraftMutation.mutateAsync({
        empId: employee.emp_id,
        templateId: selectedTemplateId,
        documentType: docType,
        proposedJoiningDate: proposedJoiningDate || undefined,
        customSalary: customSalary || undefined,
        customPf: customPf || undefined,
        notes: docNotes || undefined,
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
        notes: docNotes || undefined,
      });

      setIsFinalized(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to finalize and issue document.');
    }
  };

  const handleDownloadWordDraft = () => {
    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${docType}</title>
        <style>
          body { font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; padding: 40px; }
          h2 { color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
          table { border-collapse: collapse; width: 100%; margin: 16px 0; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background-color: #f1f5f9; }
        </style>
      </head>
      <body>
        ${draftContent}
      </body>
      </html>
    `;
    const blob = new Blob([docHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docType}_${employee.name.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Generate Company Document</h3>
              <p className="text-xs text-slate-500">
                Issue official company letters auto-populated with {employee.name}&rsquo;s details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs font-semibold">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              1
            </span>
            <span>Select Template</span>
          </div>
          <div className="w-12 h-px bg-slate-200" />
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              2
            </span>
            <span>Check Details & Values</span>
          </div>
          <div className="w-12 h-px bg-slate-200" />
          <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              3
            </span>
            <span>Review & Issue</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Select Type & Template */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Document Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'offer_letter', title: 'Offer Letter', desc: 'Pre-joining appointment offer' },
                    { id: 'joining_letter', title: 'Joining Letter', desc: 'Official appointment confirmation' },
                    { id: 'experience_letter', title: 'Experience Letter', desc: 'Relieving & tenure certification' },
                    { id: 'relieving_letter', title: 'Relieving Letter', desc: 'Formal release order' },
                    { id: 'salary_slip', title: 'Final Settlement Slip', desc: 'Final pay statement summary' },
                  ].map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setDocType(doc.id);
                        setSelectedTemplateId(undefined);
                      }}
                      className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 ${
                        docType === doc.id
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`p-2 rounded-xl mt-0.5 ${docType === doc.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{doc.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{doc.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Approved Letter Template
                </label>
                {isTemplatesLoading ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading templates...</div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-50 text-amber-700 text-xs">
                    Standard template will be used automatically for this document type.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTemplates.map((t) => (
                      <label
                        key={t.template_id}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                          selectedTemplateId === t.template_id
                            ? 'border-blue-600 bg-blue-50/40 text-blue-900'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="selectedTemplate"
                            checked={selectedTemplateId === t.template_id}
                            onChange={() => setSelectedTemplateId(t.template_id)}
                            className="text-blue-600 focus:ring-blue-600"
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

          {/* STEP 2: Pre-filled details and Document-specific overrides */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Auto-Filled Employee Data (From System)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Name:</span>
                    <strong className="text-slate-800">{employee.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Designation:</span>
                    <strong className="text-slate-800">{employee.role?.role_name || 'Designation'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Department:</span>
                    <strong className="text-slate-800">
                      {employee.departments?.map((d) => d.name).join(', ') || employee.department?.name || 'General'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Document-Specific Overrides (As noted on page 17) */}
              <div className="space-y-4">
                <div className="border-l-4 border-blue-600 pl-3">
                  <h4 className="text-sm font-bold text-slate-900">Document Specific Values</h4>
                  <p className="text-xs text-slate-500">
                    Values specified here apply only to this letter and do not alter the employee master record.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {docType === 'offer_letter' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Proposed Joining Date
                      </label>
                      <input
                        type="date"
                        value={proposedJoiningDate}
                        onChange={(e) => setProposedJoiningDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Monthly Salary / CTC (₹)
                    </label>
                    <input
                      type="number"
                      value={customSalary}
                      onChange={(e) => setCustomSalary(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Provident Fund (₹)
                    </label>
                    <input
                      type="number"
                      value={customPf}
                      onChange={(e) => setCustomPf(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Special Notes / Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Approved by HR Director with special sign-on bonus clause..."
                      value={docNotes}
                      onChange={(e) => setDocNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Review Draft, Inline Edit, Word Download & Finalize */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-2 text-xs text-blue-900 font-medium">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <span>Draft created. Review, edit content directly below, or download Word draft.</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadWordDraft}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 transition shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Word (.doc)</span>
                </button>
              </div>

              {/* Editable Word-like Document Canvas */}
              <div className="border border-slate-200 rounded-2xl shadow-inner bg-white overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-2xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Document Preview & Editor</span>
                  <span>HTML / Rich Text Canvas</span>
                </div>
                <textarea
                  rows={14}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  className="w-full p-4 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y leading-relaxed"
                />
              </div>

              {isFinalized && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Document marked as Final and saved to {employee.name}&rsquo;s records under Documents tab!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            {currentStep > 1 && !isFinalized && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              {isFinalized ? 'Close' : 'Cancel'}
            </button>

            {currentStep === 1 && (
              <button
                type="button"
                onClick={handleNextToStep2}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={generateDraftMutation.isPending}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
              >
                {generateDraftMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Word Draft</span>
              </button>
            )}

            {currentStep === 3 && !isFinalized && (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={finalizeMutation.isPending}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
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
