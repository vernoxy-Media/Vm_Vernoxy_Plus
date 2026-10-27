import React, { useRef, useState } from 'react';
import {
  Upload,
  Lock,
  FileCheck,
} from 'lucide-react';
import {
  useEmployeeDocumentsQuery,
  useToggleEmployeeDocumentMutation,
  useUploadEmployeeDocumentMutation,
  useRemoveEmployeeDocumentMutation,
} from '../../hooks/use-employee-documents';

interface LocalDocState {
  type: string;
  category: 'given_to_employee' | 'taken_from_employee' | 'agreement';
  title: string;
  isTicked: boolean;
  fileName?: string;
  fileSize?: string;
  isLocked?: boolean;
  subtitle?: string;
}

const DEFAULT_GIVEN_DOCS: LocalDocState[] = [
  { type: 'offer_letter', category: 'given_to_employee', title: 'Offer Letter', isTicked: true },
  { type: 'joining_letter', category: 'given_to_employee', title: 'Joining Letter', isTicked: true },
  {
    type: 'experience_letter',
    category: 'given_to_employee',
    title: 'Experience Letter',
    isTicked: false,
    isLocked: true,
    subtitle: 'Opens after the employee is deactivated',
  },
  {
    type: 'salary_slip',
    category: 'given_to_employee',
    title: 'Salary Slip',
    isTicked: false,
    isLocked: true,
    subtitle: 'Opens after the employee is deactivated',
  },
  {
    type: 'relieving_letter',
    category: 'given_to_employee',
    title: 'Relieving Letter',
    isTicked: false,
    isLocked: true,
    subtitle: 'Opens after the employee is deactivated',
  },
];

const DEFAULT_TAKEN_DOCS: LocalDocState[] = [
  { type: 'aadhaar_card', category: 'taken_from_employee', title: 'Aadhaar Card', isTicked: true },
  { type: 'pan_card', category: 'taken_from_employee', title: 'PAN Card', isTicked: true },
  {
    type: 'bank_details',
    category: 'taken_from_employee',
    title: 'Bank Details',
    subtitle: 'Passbook or cancelled cheque',
    isTicked: true,
  },
  { type: 'marksheet_10th', category: 'taken_from_employee', title: '10th Standard Marksheet', isTicked: true },
  { type: 'marksheet_12th', category: 'taken_from_employee', title: '12th Standard Marksheet', isTicked: true },
  { type: 'marksheet_ug', category: 'taken_from_employee', title: 'UG Marksheet', isTicked: true },
  { type: 'marksheet_pg', category: 'taken_from_employee', title: 'PG Marksheet', isTicked: false },
  {
    type: 'passport_photos',
    category: 'taken_from_employee',
    title: '2 Passport Size Photos',
    subtitle: 'Two image files',
    isTicked: true,
  },
  {
    type: 'experience_letter_old',
    category: 'taken_from_employee',
    title: 'Experience Letter',
    subtitle: 'Old company',
    isTicked: false,
  },
  {
    type: 'offer_letter_old',
    category: 'taken_from_employee',
    title: 'Offer Letter',
    subtitle: 'Old company',
    isTicked: false,
  },
  {
    type: 'joining_letter_old',
    category: 'taken_from_employee',
    title: 'Joining Letter',
    subtitle: 'Old company',
    isTicked: false,
  },
  {
    type: 'salary_slip_old',
    category: 'taken_from_employee',
    title: 'Salary Slip',
    subtitle: 'Old company',
    isTicked: false,
  },
  {
    type: 'nda_signed',
    category: 'agreement',
    title: 'NDA signed',
    subtitle: 'Signed non-disclosure agreement PDF',
    isTicked: true,
  },
];

interface EmployeeDocumentFormCardsProps {
  employeeId?: number;
  isEmployeeActive?: boolean;
}

export const EmployeeDocumentFormCards: React.FC<EmployeeDocumentFormCardsProps> = ({
  employeeId,
  isEmployeeActive = true,
}) => {
  // If in edit mode, fetch live documents from API
  const { data: serverDocs } = useEmployeeDocumentsQuery(employeeId);
  const toggleMutation = useToggleEmployeeDocumentMutation();
  const uploadMutation = useUploadEmployeeDocumentMutation();
  const removeMutation = useRemoveEmployeeDocumentMutation();

  // Local state for create mode
  const [localGivenDocs, setLocalGivenDocs] = useState<LocalDocState[]>(DEFAULT_GIVEN_DOCS);
  const [localTakenDocs, setLocalTakenDocs] = useState<LocalDocState[]>(DEFAULT_TAKEN_DOCS);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeUploadDocType, setActiveUploadDocType] = useState<string | null>(null);

  const handleTriggerUpload = (docType: string) => {
    setActiveUploadDocType(docType);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadDocType) return;

    if (employeeId) {
      try {
        await uploadMutation.mutateAsync({
          empId: employeeId,
          documentType: activeUploadDocType,
          file,
        });
      } catch (err: any) {
        alert(err?.message || 'Upload failed');
      }
    } else {
      // Local state update for create mode
      const sizeStr = `${Math.round(file.size / 1024)} KB`;
      setLocalGivenDocs((prev) =>
        prev.map((d) =>
          d.type === activeUploadDocType ? { ...d, fileName: file.name, fileSize: sizeStr, isTicked: true } : d,
        ),
      );
      setLocalTakenDocs((prev) =>
        prev.map((d) =>
          d.type === activeUploadDocType ? { ...d, fileName: file.name, fileSize: sizeStr, isTicked: true } : d,
        ),
      );
    }
    setActiveUploadDocType(null);
  };

  const handleToggleDoc = async (type: string, currentTicked: boolean) => {
    if (employeeId) {
      try {
        await toggleMutation.mutateAsync({
          empId: employeeId,
          documentType: type,
          isTicked: !currentTicked,
        });
      } catch (err: any) {
        alert(err?.message || 'Toggle failed');
      }
    } else {
      setLocalGivenDocs((prev) =>
        prev.map((d) => (d.type === type ? { ...d, isTicked: !currentTicked } : d)),
      );
      setLocalTakenDocs((prev) =>
        prev.map((d) => (d.type === type ? { ...d, isTicked: !currentTicked } : d)),
      );
    }
  };

  const handleRemoveFile = async (type: string) => {
    if (employeeId) {
      await removeMutation.mutateAsync({ empId: employeeId, documentType: type });
    } else {
      setLocalGivenDocs((prev) =>
        prev.map((d) => (d.type === type ? { ...d, fileName: undefined, fileSize: undefined } : d)),
      );
      setLocalTakenDocs((prev) =>
        prev.map((d) => (d.type === type ? { ...d, fileName: undefined, fileSize: undefined } : d)),
      );
    }
  };

  // Merge server docs if in edit mode
  const givenItems = DEFAULT_GIVEN_DOCS.map((item) => {
    if (serverDocs) {
      const sDoc = serverDocs.find((s) => s.document_type === item.type);
      if (sDoc) {
        const isLocked = sDoc.status === 'locked';
        return {
          type: item.type,
          category: item.category,
          title: sDoc.title,
          isTicked: sDoc.is_ticked,
          fileName: sDoc.file_name || undefined,
          fileSize: sDoc.file_size ? `${Math.round(sDoc.file_size / 1024)} KB` : undefined,
          isLocked,
          subtitle: item.subtitle,
        };
      }
    }
    const local = localGivenDocs.find((l) => l.type === item.type);
    return {
      ...item,
      ...local,
      isLocked: item.isLocked && isEmployeeActive,
    };
  });

  const takenItems = DEFAULT_TAKEN_DOCS.map((item) => {
    if (serverDocs) {
      const sDoc = serverDocs.find((s) => s.document_type === item.type);
      if (sDoc) {
        return {
          type: item.type,
          category: item.category,
          title: sDoc.title,
          isTicked: sDoc.is_ticked,
          fileName: sDoc.file_name || undefined,
          fileSize: sDoc.file_size ? `${Math.round(sDoc.file_size / 1024)} KB` : undefined,
          subtitle: item.subtitle,
        };
      }
    }
    const local = localTakenDocs.find((l) => l.type === item.type);
    return { ...item, ...local };
  });

  // Calculate progress for "Documents we take from employee, and NDA" (Marker 8: only ticked rows are counted!)
  const tickedTakenItems = takenItems.filter((i) => i.isTicked);
  const uploadedTakenItems = tickedTakenItems.filter((i) => Boolean(i.fileName));
  const progressPercent =
    tickedTakenItems.length > 0 ? Math.round((uploadedTakenItems.length / tickedTakenItems.length) * 100) : 100;

  return (
    <div className="space-y-8">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
      />

      {/* ========================================================================= */}
      {/* PART 5: Documents we give to the employee (Reference Screen 2)             */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
              3
            </span>
            Documents we give to the employee
          </span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>
        <p className="text-xs text-slate-500">
          These are papers the company hands over. Two are given when the person joins, three when the person leaves.
        </p>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {givenItems.map((doc) => {
            return (
              <div
                key={doc.type}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  doc.isLocked ? 'bg-slate-50/50' : 'hover:bg-slate-50/70'
                } transition`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <input
                    type="checkbox"
                    checked={doc.isTicked}
                    disabled={doc.isLocked}
                    onChange={() => handleToggleDoc(doc.type, doc.isTicked)}
                    className="mt-0.5 sm:mt-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40 cursor-pointer"
                  />
                  <div>
                    <span className={`text-sm font-bold ${doc.isLocked ? 'text-slate-400' : 'text-slate-800'}`}>
                      {doc.title}
                    </span>
                    {doc.subtitle && (
                      <span className="block text-2xs text-slate-400 mt-0.5">{doc.subtitle}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:justify-end">
                  {doc.isLocked ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-400 border border-slate-200">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked</span>
                    </span>
                  ) : doc.fileName ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{doc.fileName}</span>
                        {doc.fileSize && <span className="text-emerald-600 font-normal">{doc.fileSize}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTriggerUpload(doc.type)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(doc.type)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  ) : doc.isTicked ? (
                    <button
                      type="button"
                      onClick={() => handleTriggerUpload(doc.type)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 border-dashed transition shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-600" />
                      <span>Upload file</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 6: Documents we take from the employee, and the NDA                  */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                4
              </span>
              Documents we take from the employee
            </span>
            <div className="h-px bg-slate-200 flex-1 hidden sm:block" />
          </div>

          {/* Marker 8 Progress Bar: counts only ticked rows! */}
          <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap font-mono">
              {uploadedTakenItems.length} of {tickedTakenItems.length} uploaded
            </span>
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          These are papers the company collects from the new employee. Freshers leave old-company papers unticked.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {takenItems.map((doc) => {
            return (
              <div
                key={doc.type}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition flex flex-col justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={doc.isTicked}
                    onChange={() => handleToggleDoc(doc.type, doc.isTicked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-slate-900 block">{doc.title}</span>
                    {doc.subtitle && (
                      <span className="text-2xs text-slate-400 block mt-0.5">{doc.subtitle}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  {doc.fileName ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-2xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono truncate max-w-[180px]">
                        <FileCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{doc.fileName}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTriggerUpload(doc.type)}
                        className="text-2xs text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Replace
                      </button>
                    </div>
                  ) : doc.isTicked ? (
                    <button
                      type="button"
                      onClick={() => handleTriggerUpload(doc.type)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 border-dashed transition shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-600" />
                      <span>Upload file</span>
                    </button>
                  ) : (
                    <span className="text-2xs text-slate-400 italic">Not required</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
