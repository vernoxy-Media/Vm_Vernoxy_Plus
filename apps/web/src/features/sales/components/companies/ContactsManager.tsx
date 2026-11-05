import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  User,
  Plus,
  Star,
  UserX,
  Trash2,
  Edit2,
  Phone,
  Mail,
  AlertTriangle,
  Loader2,
  
  
} from 'lucide-react';
import {
  useSalesContactControllerAdd,
  useSalesContactControllerUpdate,
  useSalesContactControllerMakePrimary,
  useSalesContactControllerLeft,
  useSalesContactControllerRemove,
} from '@vernoxy-pulse/api-client';

import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { getInitials, getAvatarColor } from '../../utils/formatters';
import { parseApiError } from '../../utils/error';
import type { SalesContactItem, DuplicateMatchItem } from '../../types/sales.types';

export interface ContactsManagerProps {
  companyId: number;
  contacts: SalesContactItem[];
  designations?: string[];
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  companyId,
  contacts = [],
  designations = [],
}) => {
  const queryClient = useQueryClient();

  // Contact form modal state (Add / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SalesContactItem | null>(null);

  // Form values
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatchItem[]>([]);

  // Delete confirm state
  const [deletingContact, setDeletingContact] = useState<SalesContactItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Invalidate queries helper
  const invalidateCompany = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/companies/${companyId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/companies/${companyId}/contacts`] });
  };

  // Mutations
  const addMutation = useSalesContactControllerAdd();
  const updateMutation = useSalesContactControllerUpdate();
  const makePrimaryMutation = useSalesContactControllerMakePrimary();
  const markLeftMutation = useSalesContactControllerLeft();
  const removeMutation = useSalesContactControllerRemove();

  const handleOpenAdd = () => {
    setEditingContact(null);
    setName('');
    setDesignation('');
    setMobile('');
    setEmail('');
    setConfirmDuplicate(false);
    setFormError(null);
    setDuplicateMatches([]);
    setModalOpen(true);
  };

  const handleOpenEdit = (contact: SalesContactItem) => {
    setEditingContact(contact);
    setName(contact.name);
    setDesignation(contact.designation || '');
    setMobile(contact.mobile || '');
    setEmail(contact.email || '');
    setConfirmDuplicate(false);
    setFormError(null);
    setDuplicateMatches([]);
    setModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Contact name is required');
      return;
    }

    try {
      if (editingContact) {
        await updateMutation.mutateAsync({
          id: editingContact.company_person_id,
          data: {
            name: name.trim(),
            designation: designation.trim() || undefined,
            mobile: mobile.trim() || undefined,
            email: email.trim() || undefined,
            confirm_duplicate: confirmDuplicate,
          },
        });
      } else {
        await addMutation.mutateAsync({
          id: companyId,
          data: {
            name: name.trim(),
            designation: designation.trim() || undefined,
            mobile: mobile.trim() || undefined,
            email: email.trim() || undefined,
            confirm_duplicate: confirmDuplicate,
          },
        });
      }

      invalidateCompany();
      setModalOpen(false);
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      if (parsed.code === 'DUPLICATE_CONTACT' && parsed.matches && parsed.matches.length > 0) {
        setDuplicateMatches(parsed.matches);
        setFormError(parsed.message || 'A person with this mobile or email already exists.');
      } else {
        setFormError(parsed.message || 'Failed to save contact');
      }
    }
  };

  const handleMakePrimary = async (contact: SalesContactItem) => {
    try {
      await makePrimaryMutation.mutateAsync({ id: contact.company_person_id });
      invalidateCompany();
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      alert(parsed.message || 'Failed to set primary contact');
    }
  };

  const handleMarkLeft = async (contact: SalesContactItem) => {
    try {
      await markLeftMutation.mutateAsync({ id: contact.company_person_id });
      invalidateCompany();
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      alert(parsed.message || 'Failed to update contact status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingContact) return;
    setDeleteError(null);
    try {
      await removeMutation.mutateAsync({ id: deletingContact.company_person_id });
      invalidateCompany();
      setDeletingContact(null);
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setDeleteError(
        parsed.message ||
          'Cannot delete this contact as they have activity history. You can mark them as "Left company" instead.',
      );
    }
  };

  const isSaving = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Key Contacts ({contacts.length})
            </h3>
            <p className="text-xs text-gray-500">
              People associated with this organization.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors self-start sm:self-auto min-h-[36px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-lg border border-dashed border-gray-200">
          <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">No contacts added yet</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Add decision makers, directors, or purchase heads to keep communications organized.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {contacts.map((contact) => {
            const avatarColor = getAvatarColor(contact.name);
            const initials = getInitials(contact.name);
            const isLeft = !contact.is_active;

            return (
              <div
                key={contact.company_person_id}
                className={`p-4 rounded-xl border transition-all ${
                  isLeft
                    ? 'border-gray-200 bg-gray-50/60 opacity-70'
                    : contact.is_primary
                    ? 'border-amber-200/80 bg-amber-50/20 shadow-2xs'
                    : 'border-gray-200 bg-white hover:border-gray-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 ${avatarColor}`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {contact.name}
                        </span>
                        {contact.is_primary && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            Primary
                          </span>
                        )}
                        {isLeft && (
                          <span className="px-1.5 py-0.5 rounded text-2xs font-medium bg-gray-200 text-gray-700">
                            Left Company
                          </span>
                        )}
                      </div>

                      {contact.designation && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {contact.designation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Dropdown / Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(contact)}
                      title="Edit contact"
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeletingContact(contact);
                        setDeleteError(null);
                      }}
                      title="Delete contact"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contact Coordinates */}
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-xs">
                  {contact.mobile && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <a
                        href={`tel:${contact.mobile}`}
                        className="hover:text-primary transition-colors font-mono"
                      >
                        {contact.mobile}
                      </a>
                    </div>
                  )}

                  {contact.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <a
                        href={`mailto:${contact.email}`}
                        className="hover:text-primary transition-colors truncate"
                      >
                        {contact.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Footer Status Actions */}
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-end gap-2 text-2xs">
                  {!contact.is_primary && !isLeft && (
                    <button
                      type="button"
                      onClick={() => handleMakePrimary(contact)}
                      disabled={makePrimaryMutation.isPending}
                      className="text-amber-700 hover:text-amber-900 font-medium hover:underline flex items-center gap-1"
                    >
                      <Star className="w-3 h-3" />
                      <span>Make Primary</span>
                    </button>
                  )}

                  {!isLeft && (
                    <button
                      type="button"
                      onClick={() => handleMarkLeft(contact)}
                      disabled={markLeftMutation.isPending}
                      className="text-gray-500 hover:text-gray-800 font-medium hover:underline flex items-center gap-1"
                    >
                      <UserX className="w-3 h-3" />
                      <span>Mark Left</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !isSaving && setModalOpen(false)}
        title={editingContact ? 'Edit Contact' : 'Add New Contact'}
        subtitle={
          editingContact
            ? 'Update personal or designation coordinates.'
            : 'Add a new point of contact for this company.'
        }
        size="md"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to save</p>
                <p className="mt-0.5">{formError}</p>
              </div>
            </div>
          )}

          {duplicateMatches.length > 0 && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Existing Contact Matches</span>
              </p>
              <div className="divide-y divide-amber-200 bg-white/80 rounded border border-amber-200">
                {duplicateMatches.map((m) => (
                  <div key={m.company_id} className="p-2 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{m.name}</span>
                      <span className="text-gray-500 ml-1">({m.city || 'No city'})</span>
                    </div>
                    <span className="font-mono text-2xs px-1.5 py-0.5 bg-gray-100 rounded">
                      {m.company_code}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDuplicate(true);
                    handleSubmitForm({ preventDefault: () => {} } as React.FormEvent);
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-xs transition-colors"
                >
                  Confirm & Save Anyway
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mukesh Patel"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Designation</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Purchase Head, Director"
              list="modal-designations"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <datalist id="modal-designations">
              {designations.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. 9825041236"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. mukesh@company.com"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingContact ? 'Update Contact' : 'Add Contact'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingContact)}
        onClose={() => {
          if (!removeMutation.isPending) {
            setDeletingContact(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title={`Remove Contact "${deletingContact?.name}"?`}
        message={
          deleteError ||
          'Are you sure you want to delete this contact? If this person has past conversations or notes, mark them as "Left company" instead to keep the history intact.'
        }
        confirmLabel="Remove Contact"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={removeMutation.isPending}
      />
    </div>
  );
};
