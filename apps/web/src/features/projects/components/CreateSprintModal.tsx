import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { J_BTN_PRIMARY, J_BTN_SUBTLE, J_INPUT, JBanner, JField, JiraModal } from '@/shared/ui/JiraModal';
import type { CreateSprintPayload } from '../types';

interface CreateSprintModalProps {
  projectId: number;
  projectStartDate?: string;
  projectDeadline?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateSprintPayload) => Promise<void>;
}

const day = (d?: string) => (d ? d.substring(0, 10) : '');

/** Create sprint, in Jira's form: name, dates and goal. A new sprint is Planned until it is started from the board. */
export const CreateSprintModal: React.FC<CreateSprintModalProps> = ({ projectStartDate, projectDeadline, isOpen, onClose, onSubmit }) => {
  const [sprintName, setSprintName] = useState('');
  const [startDate, setStartDate] = useState(day(projectStartDate));
  const [endDate, setEndDate] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!sprintName.trim()) e.name = 'Sprint name is required.';
    if (!startDate) e.start = 'Start date is required.';
    if (!endDate) e.end = 'End date is required.';
    else if (startDate && endDate < startDate) e.end = 'End date cannot be earlier than the start date.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      await onSubmit({
        sprint_name: sprintName.trim(),
        start_date: startDate,
        end_date: endDate,
        sprint_goal: sprintGoal.trim() || undefined,
        status: 'planned',
      });
      setSprintName('');
      setEndDate('');
      setSprintGoal('');
      setErrors({});
      onClose();
    } catch (err: unknown) {
      // The API client rejects with a plain object ({ detail, message }), not an Error
      const e = err as { detail?: string; message?: string } | null;
      setFormError(e?.detail || e?.message || 'Failed to create sprint');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <JiraModal
      title="Create sprint"
      size="sm"
      onClose={onClose}
      onSubmit={handleSubmit}
      zIndex={60}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isSubmitting} className={J_BTN_SUBTLE}>Cancel</button>
          <button type="submit" disabled={isSubmitting} className={J_BTN_PRIMARY}>
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create
          </button>
        </>
      }
    >
      <p className="text-[12px] text-[#5E6C84]">Required fields are marked with an asterisk <span className="text-[#DE350B]">*</span></p>
      {formError && <JBanner>{formError}</JBanner>}

      <JField label="Sprint name" required htmlFor="sprint-name" error={errors.name}>
        <input id="sprint-name" autoFocus value={sprintName} onChange={(e) => setSprintName(e.target.value)} maxLength={100} placeholder="e.g. Sprint 1" className={J_INPUT} />
      </JField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <JField label="Start date" required htmlFor="sprint-start" error={errors.start} hint={projectStartDate ? `Project starts ${day(projectStartDate)}` : undefined}>
          <input id="sprint-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={J_INPUT} />
        </JField>
        <JField label="End date" required htmlFor="sprint-end" error={errors.end} hint={projectDeadline ? `Project deadline ${day(projectDeadline)}` : undefined}>
          <input id="sprint-end" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={J_INPUT} />
        </JField>
      </div>

      <JField label="Sprint goal" optional htmlFor="sprint-goal">
        <textarea id="sprint-goal" rows={3} value={sprintGoal} onChange={(e) => setSprintGoal(e.target.value)} placeholder="What should this sprint deliver?" className={`${J_INPUT} resize-y`} />
      </JField>
    </JiraModal>
  );
};
