import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Plus,
  ArrowRight,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  EmployeeDocumentItem,
  EmployeeActivationStatus,
  useEmployeeDocumentsQuery,
} from '../hooks/use-employee-documents';

export interface CustomChecklistItem {
  id: string;
  title: string;
  details?: string;
  is_required: boolean;
  is_done: boolean;
}

interface OnboardingChecklistTabProps {
  employee: {
    emp_id: number;
    name: string;
    joining_date: string;
    salary?: number | null;
    pf?: number | null;
    address?: string | null;
    emergency_contact_name?: string | null;
    status: string;
    department?: { name: string } | null;
    role?: { role_name: string } | null;
  };
  activationStatus?: EmployeeActivationStatus | null;
  onOpenEditProfile?: () => void;
  onOpenActivateModal?: () => void;
  onSwitchToDocuments?: () => void;
  onTriggerGenerateDoc?: (docType: string) => void;
  onTriggerUploadDoc?: (docType: string) => void;
}

export const OnboardingChecklistTab: React.FC<OnboardingChecklistTabProps> = ({
  employee,
  activationStatus,
  onOpenEditProfile,
  onOpenActivateModal,
  onSwitchToDocuments,
  onTriggerGenerateDoc,
  onTriggerUploadDoc,
}) => {
  const { data: documents = [] } = useEmployeeDocumentsQuery(employee.emp_id);

  // Custom items from localStorage
  const storageKey = `vernoxy_onboarding_custom_items_${employee.emp_id}`;
  const [customItems, setCustomItems] = useState<CustomChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDetails, setNewItemDetails] = useState('');
  const [newItemRequired, setNewItemRequired] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(customItems));
    } catch {}
  }, [customItems, storageKey]);

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    const newItem: CustomChecklistItem = {
      id: `custom_${Date.now()}`,
      title: newItemTitle.trim(),
      details: newItemDetails.trim() || undefined,
      is_required: newItemRequired,
      is_done: false,
    };

    setCustomItems((prev) => [...prev, newItem]);
    setNewItemTitle('');
    setNewItemDetails('');
    setNewItemRequired(false);
    setIsAddModalOpen(false);
  };

  const toggleCustomItem = (id: string) => {
    setCustomItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_done: !item.is_done } : item)),
    );
  };

  const removeCustomItem = (id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Evaluation of standard system items
  const isDocComplete = (d: EmployeeDocumentItem) =>
    d.status === 'uploaded' ||
    d.status === 'final' ||
    d.status === 'accepted' ||
    d.status === 'signed' ||
    d.status === 'issued' ||
    Boolean(d.file_url);

  // 1. Documents collected
  const requiredDocs = documents.filter((d) => d.is_required_for_activation);
  const requiredUploaded = requiredDocs.filter(isDocComplete).length;
  const isDocsCollectedDone = requiredDocs.length > 0 && requiredUploaded >= requiredDocs.length;
  const docsCollectedStatus = isDocsCollectedDone
    ? 'done'
    : requiredUploaded > 0
    ? 'in_progress'
    : 'pending';
  const docsCollectedDetails = `${requiredUploaded} of ${requiredDocs.length} uploaded`;

  // 2. Offer Letter
  const offerDoc = documents.find((d) => d.document_type === 'offer_letter');
  const isOfferDone = offerDoc?.status === 'accepted';
  const offerStatus = isOfferDone
    ? 'done'
    : offerDoc?.status === 'issued' || offerDoc?.status === 'draft'
    ? 'in_progress'
    : 'pending';
  const offerDetails = isOfferDone
    ? 'Accepted by candidate'
    : offerDoc?.status === 'issued'
    ? 'Issued · Waiting for candidate acceptance'
    : offerDoc?.status === 'draft'
    ? 'Draft created · Review needed'
    : 'Not generated';

  // 3. Joining Letter
  const joiningDoc = documents.find((d) => d.document_type === 'joining_letter');
  const isJoiningDone =
    joiningDoc?.status === 'issued' ||
    joiningDoc?.status === 'uploaded' ||
    joiningDoc?.status === 'final';
  const joiningStatus = isJoiningDone
    ? 'done'
    : joiningDoc?.status === 'draft'
    ? 'in_progress'
    : 'pending';
  const joiningDetails = isJoiningDone
    ? 'Issued to employee'
    : joiningDoc?.status === 'draft'
    ? 'Draft created'
    : isOfferDone
    ? 'Ready to generate'
    : 'Requires Accepted Offer';

  // 4. NDA signed
  const ndaDoc = documents.find((d) => d.document_type === 'nda_signed');
  const isNdaDone = ndaDoc?.status === 'signed' || ndaDoc?.status === 'uploaded';
  const ndaStatus = isNdaDone
    ? 'done'
    : ndaDoc?.status === 'issued' || ndaDoc?.status === 'draft'
    ? 'in_progress'
    : 'pending';
  const ndaDetails = isNdaDone
    ? 'Signed copy uploaded'
    : ndaDoc?.status === 'issued'
    ? 'Waiting for signed copy'
    : ndaDoc?.status === 'draft'
    ? 'Draft created'
    : 'Not generated';

  // 5. Personal details
  const isPersonalDetailsDone = Boolean(activationStatus?.is_details_completed);
  const personalStatus = isPersonalDetailsDone
    ? 'done'
    : employee.emergency_contact_name || employee.address
    ? 'in_progress'
    : 'pending';
  const personalDetails = isPersonalDetailsDone
    ? 'All required fields filled'
    : !employee.emergency_contact_name
    ? 'Missing: Emergency contact, bank details'
    : 'Missing: Salary, PF & OT policies';

  // Standard items definition
  const standardItems = [
    {
      id: 'docs_collected',
      title: 'Documents collected',
      isRequired: true,
      isDone: isDocsCollectedDone,
      details: docsCollectedDetails,
      status: docsCollectedStatus,
      actionLabel: 'View Documents',
      onAction: onSwitchToDocuments,
    },
    {
      id: 'offer_letter',
      title: 'Offer Letter',
      isRequired: true,
      isDone: isOfferDone,
      details: offerDetails,
      status: offerStatus,
      actionLabel: isOfferDone ? 'View' : offerDoc?.status === 'issued' ? 'Upload Accepted Copy' : offerDoc?.status === 'draft' ? 'Review Draft' : '+ Generate',
      onAction: () => {
        if (offerDoc?.status === 'issued' && onTriggerUploadDoc) {
          onTriggerUploadDoc('offer_letter');
        } else if (onTriggerGenerateDoc) {
          onTriggerGenerateDoc('offer_letter');
        } else if (onSwitchToDocuments) {
          onSwitchToDocuments();
        }
      },
    },
    {
      id: 'joining_letter',
      title: 'Joining Letter',
      isRequired: true,
      isDone: isJoiningDone,
      details: joiningDetails,
      status: joiningStatus,
      actionLabel: isJoiningDone ? 'View' : '+ Generate',
      onAction: () => {
        if (onTriggerGenerateDoc) {
          onTriggerGenerateDoc('joining_letter');
        } else if (onSwitchToDocuments) {
          onSwitchToDocuments();
        }
      },
    },
    {
      id: 'nda_signed',
      title: 'NDA signed',
      isRequired: true,
      isDone: isNdaDone,
      details: ndaDetails,
      status: ndaStatus,
      actionLabel: isNdaDone ? 'View' : ndaDoc?.status === 'issued' ? 'Upload Signed NDA' : '+ Generate',
      onAction: () => {
        if (ndaDoc?.status === 'issued' && onTriggerUploadDoc) {
          onTriggerUploadDoc('nda_signed');
        } else if (onTriggerGenerateDoc) {
          onTriggerGenerateDoc('nda_signed');
        } else if (onSwitchToDocuments) {
          onSwitchToDocuments();
        }
      },
    },
    {
      id: 'personal_details',
      title: 'Personal details',
      isRequired: true,
      isDone: isPersonalDetailsDone,
      details: personalDetails,
      status: personalStatus,
      actionLabel: isPersonalDetailsDone ? 'Edit Details' : 'Fill Details',
      onAction: onOpenEditProfile,
    },
  ];

  // Total required calculation
  const totalRequiredCount =
    standardItems.filter((i) => i.isRequired).length +
    customItems.filter((i) => i.is_required).length;

  const doneRequiredCount =
    standardItems.filter((i) => i.isRequired && i.isDone).length +
    customItems.filter((i) => i.is_required && i.is_done).length;

  const progressPct =
    totalRequiredCount > 0 ? Math.round((doneRequiredCount / totalRequiredCount) * 100) : 0;

  const isAllRequiredDone = doneRequiredCount >= totalRequiredCount;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Done</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>In progress</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Onboarding Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Card Header matching BFD Image 2 */}
        <div className="p-6 md:p-7 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Onboarding Checklist</h3>
                <p className="text-xs text-slate-500">
                  Track onboarding papers, contracts, and master profile setup before account activation
                </p>
              </div>
            </div>
          </div>

          {/* Progress Indicator matching Marker 4 */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-600 block">
                {doneRequiredCount} of {totalRequiredCount} required items done
              </span>
              <div className="w-36 md:w-44 h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5 border border-slate-200/60">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
              title="Add custom checklist item"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              <span>Add item</span>
            </button>
          </div>
        </div>

        {/* Readiness Celebration Banner if ready */}
        {isAllRequiredDone && (
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">All Required Onboarding Items Completed!</h4>
                <p className="text-xs text-emerald-100">
                  All documents, letters, agreements, and employee master details are complete. Ready for account activation.
                </p>
              </div>
            </div>

            {onOpenActivateModal && (
              <button
                type="button"
                onClick={onOpenActivateModal}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white text-emerald-800 text-xs font-bold shadow-md hover:bg-emerald-50 transition cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Activate Account Now</span>
              </button>
            )}
          </div>
        )}

        {/* Checklist Table matching BFD Image 1 & 2 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-2xs font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-6 w-1/3">Item</th>
                <th className="py-3 px-6 w-1/3">Details</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Standard System Checklist Items */}
              {standardItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3.5">
                      {/* Checkbox auto-ticked by system (read-only) */}
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                          item.isDone
                            ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs'
                            : 'border-2 border-slate-300 bg-white'
                        }`}
                        title={item.isDone ? 'Completed by system' : 'Pending completion'}
                      >
                        {item.isDone && <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">{item.title}</span>
                        {item.isRequired && <span className="text-rose-500 font-bold text-xs">*</span>}
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <span className="text-xs font-medium text-slate-600">{item.details}</span>
                  </td>

                  <td className="py-4 px-6">{getStatusBadge(item.status)}</td>

                  <td className="py-4 px-6 text-right">
                    {item.onAction && (
                      <button
                        type="button"
                        onClick={item.onAction}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          item.isDone
                            ? 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                        }`}
                      >
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="w-3 h-3 opacity-60" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {/* Custom Admin Checklist Items (Marker 7) */}
              {customItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors bg-purple-50/20">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3.5">
                      {/* Custom checkbox interactive */}
                      <button
                        type="button"
                        onClick={() => toggleCustomItem(item.id)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                          item.is_done
                            ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xs'
                            : 'border-2 border-slate-300 bg-white hover:border-purple-400'
                        }`}
                        title="Click to toggle status"
                      >
                        {item.is_done && <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-800">{item.title}</span>
                        {item.is_required && <span className="text-rose-500 font-bold text-xs">*</span>}
                        <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60 ml-1">
                          Custom
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <span className="text-xs font-medium text-slate-500">
                      {item.details || 'Added by administrator'}
                    </span>
                  </td>

                  <td className="py-4 px-6">{getStatusBadge(item.is_done ? 'done' : 'pending')}</td>

                  <td className="py-4 px-6 text-right">
                    <button
                      type="button"
                      onClick={() => removeCustomItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Custom Item Modal (Marker 7) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Onboarding Checklist Item</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Item Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laptop ready, Access card issued, Slack invite"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Details (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mac configured with VPN and dev tools"
                  value={newItemDetails}
                  onChange={(e) => setNewItemDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newItemRequired}
                    onChange={(e) => setNewItemRequired(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Mark as Required</span>
                    <span className="text-[11px] text-slate-500 block">
                      Account activation will require this item to be ticked done.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newItemTitle.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
