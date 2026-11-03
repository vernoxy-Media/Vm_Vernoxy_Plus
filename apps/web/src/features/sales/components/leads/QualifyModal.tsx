import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Clock, Loader2, Check, Plus, X } from 'lucide-react';
import {
  useSalesLeadStatusControllerQualification,
  useSalesLeadStatusControllerQualify,
  useSalesLeadControllerMasters,
  useSalesActivityControllerQuickLog,
  useSalesActivityControllerAddNote,
} from '@vernoxy-pulse/api-client';

import { Modal } from '../common/Modal';
import { parseApiError } from '../../utils/error';
import { EMPTY_LEAD_MASTERS } from '../../types/sales.types';
import type { LeadQualificationResponse, SalesLeadMastersResponse } from '../../types/sales.types';

export interface QualifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  leadCode?: string;
  companyName?: string;
  /** The lead's current Service Fit; the user can correct it here. */
  initialServiceFit?: string[];
  onSuccess?: () => void;
}

const NOTE_KEYS: Record<string, 'Requirement' | 'Budget' | 'Readiness'> = {
  requirement: 'Requirement',
  budget: 'Budget',
  readiness: 'Readiness',
};
const CHANNELS = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Site Visit'] as const;

/** Fills one missing checklist item without leaving the popup: a conversation, or a Requirement / Budget / Readiness note. */
const QuickAdd: React.FC<{ itemKey: string; leadId: number; onSaved: () => void }> = ({ itemKey, leadId, onSaved }) => {
  const noteType = NOTE_KEYS[itemKey];
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>('Call');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const quickLog = useSalesActivityControllerQuickLog();
  const addNote = useSalesActivityControllerAddNote();
  const saving = quickLog.isPending || addNote.isPending;

  if (itemKey !== 'conversation' && !noteType) return null;

  const save = async () => {
    const value = text.trim();
    if (!value) return;
    setError(null);
    try {
      if (noteType) await addNote.mutateAsync({ id: leadId, data: { note_type: noteType, note: value } });
      else await quickLog.mutateAsync({ id: leadId, data: { type: channel, text: value } });
      setText('');
      setOpen(false);
      onSaved();
    } catch (err: unknown) {
      setError(parseApiError(err).message || 'Could not save');
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 text-xs font-semibold text-primary transition hover:bg-primary/10">
        <Plus className="h-3.5 w-3.5" />
        {noteType ? `Add ${noteType.toLowerCase()} note` : 'Log a conversation'}
      </button>
    );
  }

  return (
    <div className="mt-2.5 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      {!noteType && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type">
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={channel === c}
              onClick={() => setChannel(c)}
              className={`h-8 rounded-full border px-3 text-xs font-medium transition ${channel === c ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <textarea
        autoFocus
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={noteType ? `Write the ${noteType.toLowerCase()} note…` : `What was discussed on the ${channel.toLowerCase()}?`}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary/50 focus:outline-hidden focus:ring-4 focus:ring-primary/10"
      />
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} disabled={saving} className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100">
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
        <button type="button" onClick={save} disabled={saving || !text.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
};

export const QualifyModal: React.FC<QualifyModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadCode,
  companyName,
  initialServiceFit = [],
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [selectedServiceFits, setSelectedServiceFits] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch qualification checklist
  const { data: qualRaw, isLoading } = useSalesLeadStatusControllerQualification(
    leadId,
    {
      query: {
        enabled: Boolean(isOpen && leadId),
      },
    },
  );

  const qualData: LeadQualificationResponse | null = (
    (qualRaw as unknown as { data?: LeadQualificationResponse })?.data ??
    (qualRaw as unknown as LeadQualificationResponse) ??
    null
  );

  // Fetch lead masters for service fits
  const { data: mastersRaw } = useSalesLeadControllerMasters();
  const masters: SalesLeadMastersResponse = (
    (mastersRaw as unknown as { data?: SalesLeadMastersResponse })?.data ??
    (mastersRaw as unknown as SalesLeadMastersResponse) ?? EMPTY_LEAD_MASTERS
  );

  // Initialize selected service fits from checklist
  useEffect(() => {
    if (isOpen) setSelectedServiceFits(initialServiceFit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, leadId]);

  const qualifyMutation = useSalesLeadStatusControllerQualify();

  /** A conversation or note was just saved: re-check the checklist and refresh everything that shows this lead. */
  const refreshChecklist = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/v1/sales/leads') });
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/v1/sales/follow-ups') });
  };

  const toggleServiceFit = (fit: string) => {
    setSelectedServiceFits((prev) =>
      prev.includes(fit) ? prev.filter((f) => f !== fit) : [...prev, fit],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      await qualifyMutation.mutateAsync({
        id: leadId,
        data: {
          service_fit: selectedServiceFits,
        },
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/leads'] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}`] });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Qualification cannot be completed');
    }
  };

  const checklist = qualData?.items ?? [];
  const canQualify = qualData?.can_qualify ?? false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !qualifyMutation.isPending && onClose()}
      title="Qualify Sales Lead"
      subtitle={
        companyName
          ? `${companyName} (${leadCode || `LEAD-${leadId}`})`
          : 'Verify qualification criteria before advancing to Qualified stage.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Qualification Requirement Incomplete</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Checklist */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700">
                Qualification Criteria Checklist
              </label>

              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50/50 overflow-hidden">
                {checklist.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          item.done
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.done ? (
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <p
                          className={`font-semibold ${
                            item.done ? 'text-gray-900' : 'text-amber-900'
                          }`}
                        >
                          {item.label}
                        </p>
                        <p className="text-2xs text-gray-500 mt-0.5">{item.detail ?? ''}</p>
                        {!item.done && <QuickAdd itemKey={item.key} leadId={leadId} onSaved={refreshChecklist} />}
                      </div>
                    </div>

                    <span
                      className={`text-2xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        item.done
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {item.done ? 'Met' : 'Required'}
                    </span>
                  </div>
                ))}
              </div>

              {!canQualify && (
                <p className="text-2xs text-amber-700 italic">
                  Use "Add" under each Required item to fill it in here, then mark the lead as Qualified.
                </p>
              )}
            </div>

            {/* Service Fit Confirmation */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Confirmed Service Fit (Select at least one)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {masters.service_fits.map((fit) => {
                  const isSelected = selectedServiceFits.includes(fit);
                  return (
                    <button
                      key={fit}
                      type="button"
                      onClick={() => toggleServiceFit(fit)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary font-semibold'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{fit}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canQualify || qualifyMutation.isPending || selectedServiceFits.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors min-h-[44px]"
          >
            {qualifyMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Mark as Qualified</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
