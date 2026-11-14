import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Circle, Clock, Loader2, Rocket } from 'lucide-react';
import { J_BTN_DANGER, J_BTN_PRIMARY, J_BTN_SUBTLE, J_INPUT, JBanner, JField, JiraModal } from '@/shared/ui/JiraModal';
import { fetchDeliveryReadiness } from '../api/projects.api';
import type { DeliveryReadiness } from '../types';

interface DeliverProjectDialogProps {
  projectId: number;
  projectName: string;
  /** Only an admin may deliver a project that still has open work. */
  isAdmin: boolean;
  onClose: () => void;
  onConfirm: (reason: string | undefined, force: boolean) => Promise<void>;
}

const hours = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10}h`;

/** The last step of a project: a checklist of what is still open, then Deliver. */
export const DeliverProjectDialog: React.FC<DeliverProjectDialogProps> = ({ projectId, projectName, isAdmin, onClose, onConfirm }) => {
  const [data, setData] = useState<DeliveryReadiness | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchDeliveryReadiness(projectId)
      .then((d) => live && setData(d))
      .catch((e) => live && setLoadError((e as { detail?: string; message?: string })?.detail || (e as Error)?.message || 'Could not check the project'));
    return () => {
      live = false;
    };
  }, [projectId]);

  const open = data && !data.ready;
  const canDeliver = data && (data.ready || isAdmin);
  const needsReason = Boolean(open);

  const deliver = async () => {
    if (!data) return;
    if (needsReason && !reason.trim()) return setError('Please give a reason for delivering with open work.');
    setBusy(true);
    setError(null);
    try {
      await onConfirm(needsReason ? reason.trim() : undefined, needsReason);
      onClose();
    } catch (e) {
      setError((e as { detail?: string; message?: string })?.detail || (e as Error)?.message || 'Could not deliver the project');
      setBusy(false);
    }
  };

  return (
    <JiraModal
      title={`Deliver ${projectName}`}
      size="md"
      onClose={onClose}
      zIndex={65}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={J_BTN_SUBTLE}>Cancel</button>
          {canDeliver && (
            <button type="button" onClick={deliver} disabled={busy || !data} className={open ? J_BTN_DANGER : J_BTN_PRIMARY}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              {open ? 'Deliver anyway' : 'Deliver project'}
            </button>
          )}
        </>
      }
    >
      {!data && !loadError && (
        <div className="flex items-center gap-2 py-6 text-[14px] text-[#5E6C84]"><Loader2 className="h-4 w-4 animate-spin" /> Checking what is still open…</div>
      )}
      {loadError && <JBanner>{loadError}</JBanner>}

      {data && (
        <>
          <p className="text-[14px] text-[#42526E]">
            {data.ready ? 'Everything is finished. Delivering closes the project and records today as its end date.' : 'Some work is still open on this project.'}
          </p>

          <ul className="divide-y divide-[#DFE1E6] rounded-[3px] border border-[#DFE1E6]">
            {data.checks.map((c) => (
              <li key={c.key} className="flex items-center gap-3 px-3 py-2.5">
                {c.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[#36B37E]" /> : <Circle className="h-5 w-5 shrink-0 text-[#DE350B]" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-[#172B4D]">{c.label}</p>
                  <p className={`text-[12px] ${c.done ? 'text-[#5E6C84]' : 'font-medium text-[#BF2600]'}`}>{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#5E6C84]">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Logged <b className="font-semibold text-[#172B4D]">{hours(data.counts.loggedSeconds / 60)}</b> of <b className="font-semibold text-[#172B4D]">{hours(data.counts.estimatedMinutes)}</b> estimated</span>
            {data.counts.overdueIssues > 0 && <span className="font-medium text-[#BF2600]">{data.counts.overdueIssues} overdue issue{data.counts.overdueIssues === 1 ? '' : 's'}</span>}
          </p>

          {open && isAdmin && (
            <>
              <p className="flex items-start gap-2 rounded-[3px] bg-[#FFFAE6] px-3 py-2 text-[13px] text-[#172B4D] shadow-[inset_3px_0_0_#FF991F]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF991F]" />
                As an admin you can deliver it anyway. The reason is saved with the project.
              </p>
              <JField label="Reason for delivering with open work" required htmlFor="deliver-reason">
                <textarea id="deliver-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The client accepted the build; the open bugs move to a maintenance project." className={`${J_INPUT} resize-y`} />
              </JField>
            </>
          )}
          {open && !isAdmin && (
            <JBanner tone="info">Finish the open work first, or ask an admin to deliver the project with a reason.</JBanner>
          )}
          {error && <JBanner>{error}</JBanner>}
        </>
      )}
    </JiraModal>
  );
};
