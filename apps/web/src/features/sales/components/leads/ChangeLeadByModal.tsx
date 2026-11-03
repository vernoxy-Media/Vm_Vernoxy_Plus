import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import {
  useSalesLeadStatusControllerChangeLeadBy,
  useSalesLeadControllerMasters,
} from '@vernoxy-pulse/api-client';

import { Modal } from '../common/Modal';
import { PersonPicker } from '../common/PersonPicker';
import { getAvatarColor, getInitials } from '../../utils/formatters';
import { parseApiError } from '../../utils/error';
import { EMPTY_LEAD_MASTERS } from '../../types/sales.types';
import type { SalesLeadMastersResponse } from '../../types/sales.types';

export interface ChangeLeadByModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  leadCode?: string;
  companyName?: string;
  currentLeadByEmpId?: number;
  onSuccess?: () => void;
}

export const ChangeLeadByModal: React.FC<ChangeLeadByModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadCode,
  companyName,
  currentLeadByEmpId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const { data: mastersRaw } = useSalesLeadControllerMasters();
  const masters: SalesLeadMastersResponse = (
    (mastersRaw as unknown as { data?: SalesLeadMastersResponse })?.data ??
    (mastersRaw as unknown as SalesLeadMastersResponse) ?? EMPTY_LEAD_MASTERS
  );

  const [selectedEmpId, setSelectedEmpId] = useState<number | ''>('');
  const people = masters.lead_by_users ?? [];
  const current = people.find((p) => p.emp_id === currentLeadByEmpId);
  const next = people.find((p) => p.emp_id === selectedEmpId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const changeMutation = useSalesLeadStatusControllerChangeLeadBy();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedEmpId) {
      setErrorMessage('Please select a sales representative');
      return;
    }

    try {
      await changeMutation.mutateAsync({
        id: leadId,
        data: {
          lead_by_id: Number(selectedEmpId),
        },
      });

      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/leads'] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}`] });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Failed to reassign lead representative');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !changeMutation.isPending && onClose()}
      title="Reassign Lead Representative"
      subtitle={
        companyName
          ? `Transfer lead ${leadCode || `LEAD-${leadId}`} to another team member.`
          : 'Admin privilege: transfer ownership of this pipeline opportunity.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to reassign</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {current && next && (
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-xs">
            {[current, next].map((p, i) => (
              <React.Fragment key={p.emp_id}>
                {i === 1 && <ArrowRight className="h-4 w-4 text-gray-400" />}
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${getAvatarColor(p.name)}`}>
                    {getInitials(p.name)}
                  </span>
                  <span className="truncate font-semibold text-gray-800">{p.name}</span>
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Transfer to <span className="text-red-500">*</span>
          </label>
          <PersonPicker
            people={people}
            value={selectedEmpId === '' ? null : selectedEmpId}
            onChange={setSelectedEmpId}
            currentEmpId={currentLeadByEmpId}
            autoFocus
          />
          <p className="text-2xs text-gray-500 mt-2">The new owner will be notified of this transfer.</p>
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
            disabled={changeMutation.isPending || !selectedEmpId}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
          >
            {changeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Transfer Lead</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
