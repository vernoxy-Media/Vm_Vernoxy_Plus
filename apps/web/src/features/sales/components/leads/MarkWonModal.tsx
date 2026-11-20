import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Trophy,
  
  AlertCircle,
  Loader2,
  
  Briefcase,
  IndianRupee,
  Lock,
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
  const [revenue, setRevenue] = useState<string>('');
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
  const canSetRevenue = Boolean(formData?.can_set_revenue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!wonOn) {
      setErrorMessage('Please specify the date when the deal was agreed');
      return;
    }

    const revenueClean = revenue.replace(/,/g, '').trim();
    if (canSetRevenue && revenueClean && !/^\d+(\.\d{1,2})?$/.test(revenueClean)) {
      setErrorMessage('Please enter a valid project revenue (numbers only, up to 2 decimals) or leave it empty.');
      return;
    }

    try {
      const response = await convertMutation.mutateAsync({
        id: leadId,
        data: {
          won_on: wonOn,
          win_note: winNote.trim() || undefined,
          // Optional, Admin only; the server ignores it for everybody else.
          ...(canSetRevenue && revenueClean ? { project_revenue: Number(revenueClean) } : {}),
        } as never,
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

            {/* Project revenue: Admin only, optional */}
            {canSetRevenue && (
              <div className="rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/70 to-white p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="project-revenue" className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <IndianRupee className="h-4 w-4" />
                    </span>
                    Project Revenue
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Optional</span>
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-indigo-600">
                    <Lock className="h-3 w-3" /> Visible to Admin only
                  </span>
                </div>
                <div className="relative mt-2.5">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">₹</span>
                  <input
                    id="project-revenue"
                    inputMode="decimal"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value.replace(/[^\d.,]/g, ''))}
                    placeholder="e.g. 5,00,000"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-3.5 text-sm font-semibold text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 min-h-[44px]"
                  />
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-gray-500">
                  What the client pays for the project. It is used to work out project profit. You can leave it empty and add it later from the Client record.
                </p>
              </div>
            )}


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
