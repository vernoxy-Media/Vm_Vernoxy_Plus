import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { useSalesClientControllerReverse } from '@vernoxy-pulse/api-client';

import { Modal } from '../common/Modal';
import { parseApiError, } from '../../utils/error';

export interface ReverseConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  leadCode?: string;
  companyName?: string;
  onSuccess?: () => void;
}

export const ReverseConversionModal: React.FC<ReverseConversionModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadCode,
  companyName,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<Array<{ name: string; company_code: string | null; reason: string }>>([]);

  const reverseMutation = useSalesClientControllerReverse();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setBlockers([]);

    if (!reason.trim()) {
      setErrorMessage('Please state the reason for reversing this client conversion');
      return;
    }

    try {
      await reverseMutation.mutateAsync({
        id: leadId,
        data: {
          reason: reason.trim(),
        },
      });

      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/leads'] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/companies'] });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Cannot reverse client conversion');
      setBlockers(parsed.blockers || []);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !reverseMutation.isPending && onClose()}
      title="Reverse Client Conversion"
      subtitle={
        companyName
          ? `Admin Privilege: Return ${companyName} (${leadCode || `LEAD-${leadId}`}) from Client back to Qualified Lead stage.`
          : 'Revert converted client status and reopen the sales opportunity.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 space-y-1.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Conversion Reversal Blocked</p>
                <p>{errorMessage}</p>
              </div>
            </div>
            {blockers.length > 0 && (
              <div className="mt-2 pl-6">
                <p className="font-medium text-red-900">Blocking Conditions:</p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-red-700">
                  {blockers.map((b, i) => (
                    <li key={i}>{b.name}: {b.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            Reversing this conversion will revert the lead status to <strong>Qualified</strong>. This is only
            allowed if the client has no active projects or billing records created.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Reason for Reversing Conversion <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Contract cancelled before project kickoff; agreement nullified..."
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

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
            disabled={reverseMutation.isPending || !reason.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 shadow-sm transition-colors min-h-[44px]"
          >
            {reverseMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Reverse to Qualified Lead</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
