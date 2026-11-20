import { ICandidateRepository } from '../ports/candidate.repository.port';
import { CandidateValidationError, CleanCandidate, duplicateMessage, isPlainStage } from '../../domain/candidate-input-rules';

/** Today as YYYY-MM-DD in India, where the company works */
export function todayInIndia(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

/**
 * The checks on a cleaned candidate that need the database. `candidateId` is set when editing (the candidate does
 * not count as its own duplicate); `previousStage` too, because a candidate keeps the stage it already has.
 */
export async function assertCandidateFitsData(
  repo: ICandidateRepository,
  c: CleanCandidate,
  opts: { candidateId?: number; previous?: { stage: string; assignedToEmpId?: number | null; referredByEmpId?: number | null } } = {},
): Promise<void> {
  const dup = await repo.findDuplicate(c.email, c.phone, opts.candidateId);
  if (dup) throw new CandidateValidationError(duplicateMessage(dup), dup.matchedOn);

  if (!(await repo.roleBelongsToDepartment(c.roleId, c.depId))) {
    throw new CandidateValidationError('The selected position does not belong to the selected department.', 'role_id');
  }

  // An employee who left can stay the referrer or assignee of an old candidate, but cannot be chosen anew
  if (c.referredByEmpId && c.referredByEmpId !== opts.previous?.referredByEmpId && !(await repo.isActiveEmployee(c.referredByEmpId))) {
    throw new CandidateValidationError('The referring employee must be an active employee.', 'referred_by_emp_id');
  }
  if (c.assignedToEmpId && c.assignedToEmpId !== opts.previous?.assignedToEmpId && !(await repo.isActiveEmployee(c.assignedToEmpId))) {
    throw new CandidateValidationError('A candidate can only be assigned to an active employee.', 'assigned_to_emp_id');
  }

  if (opts.previous && c.stage === opts.previous.stage) return;
  const known = await repo.activeStageCodes();
  if (!known.includes(c.stage)) throw new CandidateValidationError('Please select a stage from the list.', 'stage');
  if (!isPlainStage(c.stage)) {
    throw new CandidateValidationError('Selected, On Hold, Rejected and Onboarding are set from their own forms, not here.', 'stage');
  }
}
