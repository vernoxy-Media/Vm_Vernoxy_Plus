import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

/** The stages a lead can be moved to by hand. Converted is reached with "Mark as Won". */
export const MOVE_STAGES = ['New', 'Contacted', 'Qualified', 'On Hold', 'Lost'] as const;
export type MoveStage = (typeof MOVE_STAGES)[number];

/**
 * Moves a lead to any stage, from any stage, with nothing to fill in first.
 * The one exception is Lost: it asks for a reason, so the pages open the Mark as Lost pop-up for it.
 */
export function useMoveLeadStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { leadId: number; to: MoveStage; reason?: string; note?: string }) =>
      customFetch<unknown>(`/api/v1/sales/leads/${v.leadId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: v.to, reason: v.reason, note: v.note }),
      }),
    onSuccess: (_data, v) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/leads'] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${v.leadId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/companies'] });
    },
  });
}
