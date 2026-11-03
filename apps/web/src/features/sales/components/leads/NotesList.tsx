import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Pin,
  Plus,
  Edit2,
  
  AlertCircle,
  Loader2,
  
  
  
  
} from 'lucide-react';
import {
  useSalesActivityControllerNotes,
  useSalesActivityControllerAddNote,
  useSalesActivityControllerEditNote,
} from '@vernoxy-pulse/api-client';

import { Modal } from '../common/Modal';
import { timeAgo } from '../../utils/date';
import { parseApiError } from '../../utils/error';
import { unwrapList } from '../../utils/response';
import type { NoteItem, NoteType } from '../../types/sales.types';

export interface NotesListProps {
  leadId: number;
}

export const NotesList: React.FC<NotesListProps> = ({ leadId }) => {
  const queryClient = useQueryClient();

  const { data: notesRaw, isLoading } = useSalesActivityControllerNotes(leadId, {
    query: {
      enabled: Boolean(leadId),
    },
  });

  const notes: NoteItem[] = unwrapList<NoteItem>(notesRaw);

  // Form modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [type, setType] = useState<NoteType>('General');
  const [text, setText] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addMutation = useSalesActivityControllerAddNote();
  const editMutation = useSalesActivityControllerEditNote();

  const handleOpenAdd = () => {
    setEditingNote(null);
    setType('General');
    setText('');
    setIsPinned(false);
    setErrorMessage(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (note: NoteItem) => {
    setEditingNote(note);
    setType(note.note_type as NoteType);
    setText(note.note);
    setIsPinned(Boolean(note.is_pinned));
    setErrorMessage(null);
    setModalOpen(true);
  };

  const handleTogglePin = async (note: NoteItem) => {
    try {
      await editMutation.mutateAsync({
        id: note.note_id,
        data: {
          is_pinned: !note.is_pinned,
        },
      });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}/notes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}`] });
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      alert(parsed.message || 'Failed to update pin status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!text.trim()) {
      setErrorMessage('Note content cannot be empty');
      return;
    }

    try {
      if (editingNote) {
        await editMutation.mutateAsync({
          id: editingNote.note_id,
          data: {
            note_type: type,
            note: text.trim(),
            is_pinned: isPinned,
          },
        });
      } else {
        await addMutation.mutateAsync({
          id: leadId,
          data: {
            note_type: type,
            note: text.trim(),
            is_pinned: isPinned,
          },
        });
      }

      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}/notes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}`] });
      setModalOpen(false);
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Failed to save note');
    }
  };

  const getTypeStyle = (noteType: string) => {
    switch (noteType) {
      case 'Requirement':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Budget':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Readiness':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'General':
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const isSaving = addMutation.isPending || editMutation.isPending;

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Notes & Criteria ({notes.length})</h3>
          <p className="text-xs text-gray-500">
            Categorized notes for General observations, Requirements, Budget, and Readiness.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors self-start sm:self-auto min-h-[38px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Note</span>
        </button>
      </div>

      {/* Notes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-gray-200">
          <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-800">No notes recorded yet</p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            Document important insights, budget figures, and readiness timelines to help qualify the deal.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Note</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {notes.map((item) => (
            <div
              key={item.note_id}
              className={`p-4 rounded-xl border transition-all space-y-3 ${
                item.is_pinned
                  ? 'border-amber-300 bg-amber-50/20 shadow-2xs'
                  : 'border-gray-200 bg-white hover:border-gray-300 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-2xs font-semibold border ${getTypeStyle(
                      item.note_type,
                    )}`}
                  >
                    {item.note_type}
                  </span>
                  {item.is_pinned && (
                    <span className="inline-flex items-center gap-0.5 text-2xs font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      <Pin className="w-2.5 h-2.5 fill-amber-600 text-amber-600" />
                      Pinned
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(item)}
                    title={item.is_pinned ? 'Unpin note' : 'Pin note to top'}
                    className={`p-1.5 rounded-md transition-colors ${
                      item.is_pinned
                        ? 'text-amber-700 hover:bg-amber-100'
                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${item.is_pinned ? 'fill-amber-600' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    title="Edit note"
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                {item.note}
              </p>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-2xs text-gray-400">
                <span>By {item.created_by?.name || 'Representative'}</span>
                <span>{timeAgo(item.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Note Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !isSaving && setModalOpen(false)}
        title={editingNote ? 'Edit Note' : 'Add Lead Note'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to save</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Note Category</label>
            <div className="grid grid-cols-4 gap-2">
              {(['General', 'Requirement', 'Budget', 'Readiness'] as NoteType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 text-xs font-medium rounded-lg border text-center transition-colors ${
                    type === t
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Note Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Record details, technical requirements, allocated budget, or expected project delivery timeline..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Pin to top toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary/20 border-gray-300 cursor-pointer"
              />
              <span className="text-xs font-medium text-gray-700">
                Pin this note to the top of Lead Details
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !text.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingNote ? 'Update Note' : 'Add Note'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
