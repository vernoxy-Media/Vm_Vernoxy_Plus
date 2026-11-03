import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Trophy,
  
  AlertCircle,
  Loader2,
  
  Briefcase,
  ExternalLink,
  
} from 'lucide-react';
import {
  useSalesClientControllerForm,
  useSalesClientControllerConvert,
} from '@vernoxy-pulse/api-client';

import { Modal } from '../common/Modal';
import { parseApiError } from '../../utils/error';
import type { ClientFormResponse } from '../../types/sales.types';

export interface MarkWonModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  leadCode?: string;
  companyName?: string;
  onSuccess?: (clientId: number) => void;
}

export const MarkWonModal: React.FC<MarkWonModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadCode,
  companyName,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const todayStr = new Date().toISOString().split('T')[0];
  const [wonOn, setWonOn] = useState<string>(todayStr);
  const [winNote, setWinNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);

  // Fetch client form preview
  const { data: formRaw, isLoading } = useSalesClientControllerForm(leadId, {
    query: {
      enabled: Boolean(isOpen && leadId),
    },
  });

  const formData: ClientFormResponse | null = (
    (formRaw as unknown as { data?: ClientFormResponse })?.data ??
    (formRaw as unknown as ClientFormResponse) ??
    null
  );

  useEffect(() => {
    if (formData?.won_on.default) setWonOn(formData.won_on.default);
  }, [formData?.won_on.default]);

  const convertMutation = useSalesClientControllerConvert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!wonOn) {
      setErrorMessage('Please specify the date when the deal was agreed');
      return;
    }

    try {
      const response = await convertMutation.mutateAsync({
        id: leadId,
        data: {
          won_on: wonOn,
          win_note: winNote.trim() || undefined,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/leads'] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/companies'] });

      const newClientId =
        (response as unknown as { client_id?: number })?.client_id ??
        (response as unknown as { data?: { client_id?: number } })?.data?.client_id ??
        (response as unknown as { id?: number })?.id ??
        null;

      if (newClientId) {
        setCreatedClientId(newClientId);
        onSuccess?.(newClientId);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Failed to convert lead to client');
    }
  };

  // If already created successfully, show the celebration card
  if (createdClientId) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Congratulations! Deal Won 🎉"
        size="md"
      >
        <div className="py-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {companyName || 'Company'} is now an Active Client!
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              The lead has been locked as Converted, open follow-ups have been completed, and the organization has been transferred to Client management.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[40px]"
            >
              Done
            </button>
            <Link
              to={`/sales/clients/${createdClientId}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors min-h-[40px]"
            >
              <Briefcase className="w-4 h-4" />
              <span>View Client Record</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !convertMutation.isPending && onClose()}
      title="Mark as Won & Convert to Client"
      subtitle={
        companyName
          ? `Finalize deal for ${companyName} (${leadCode || `LEAD-${leadId}`})`
          : 'Promote this qualified opportunity into an active client relationship.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to finalize conversion</p>
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
            {/* Preview Banner */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-emerald-600" />
                  <span>Client ID (preview):</span>
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
                  {formData?.client_id_preview || 'CLI-AUTO'}
                </span>
              </div>

              {formData?.carried_forward && formData.carried_forward.length > 0 && (
                <div className="text-2xs text-emerald-800 space-y-0.5 pt-1 border-t border-emerald-200/60">
                  <p className="font-medium">Carried forward into the Client record:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-emerald-700">
                    {formData.carried_forward.map((c) => (
                      <li key={c.key}>{c.summary}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Won On Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Won On (Agreement Date) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={wonOn}
                max={formData?.won_on.max ?? todayStr}
                min={formData?.won_on.min}
                onChange={(e) => setWonOn(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
              />
              <p className="text-2xs text-gray-400 mt-0.5">
                The date the proposal or PO was formally agreed (cannot be in the future).
              </p>
            </div>

            {/* Win Note */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Win Note / Scope Agreed
              </label>
              <textarea
                value={winNote}
                onChange={(e) => setWinNote(e.target.value)}
                rows={3}
                placeholder="e.g. Signed annual maintenance contract for ERP support. Agreed payment terms: 50% advance, PO #8492..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </>
        )}

        {/* Actions */}
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
            disabled={convertMutation.isPending || isLoading}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-colors min-h-[44px]"
          >
            {convertMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Finalize & Convert to Client</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
