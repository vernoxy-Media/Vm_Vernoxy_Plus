import { TaskStage } from '../entities/task.entity';

export function validateAssigneeIds(ids: number[]): { valid: boolean; error?: string } {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { valid: false, error: 'At least one assignee is required' };
  }
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length > 50) {
    return { valid: false, error: 'A task cannot have more than 50 assignees' };
  }
  for (const id of uniqueIds) {
    if (!Number.isInteger(id) || id <= 0) {
      return { valid: false, error: `Invalid employee ID: ${id}` };
    }
  }
  return { valid: true };
}

export function formatTaskCode(year: number, sequenceNumber: number): string {
  return `TSK-${year}-${sequenceNumber.toString().padStart(4, '0')}`;
}

export function canTransitionStage(
  fromStage: TaskStage,
  toStage: TaskStage,
  isAdmin: boolean,
): { allowed: boolean; reason?: string } {
  if (fromStage === toStage) {
    return { allowed: false, reason: `Task is already in stage "${toStage}"` };
  }

  if (fromStage === 'assigned') {
    if (toStage === 'in_progress') return { allowed: true };
    return { allowed: false, reason: 'Assigned tasks can only transition to "in_progress"' };
  }

  if (fromStage === 'in_progress') {
    if (toStage === 'assigned' || toStage === 'requested') return { allowed: true };
    return {
      allowed: false,
      reason: 'In Progress tasks can only transition to "assigned" or "requested"',
    };
  }

  if (fromStage === 'requested') {
    if (toStage === 'in_progress') return { allowed: true };
    if (toStage === 'completed') {
      if (!isAdmin) {
        return { allowed: false, reason: 'Only administrators can approve and complete tasks' };
      }
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Requested tasks can only transition to "in_progress" (rejected/withdrawn) or "completed" (approved)',
    };
  }

  if (fromStage === 'completed') {
    if (!isAdmin) {
      return { allowed: false, reason: 'Only administrators can reopen completed tasks' };
    }
    if (toStage === 'in_progress') return { allowed: true };
    return { allowed: false, reason: 'Completed tasks can only be reopened to "in_progress"' };
  }

  return { allowed: false, reason: `Unsupported stage transition from "${fromStage}" to "${toStage}"` };
}

export function isOverdue(
  dueDate: string | Date | null,
  stage: TaskStage,
  now: Date = new Date(),
): boolean {
  if (!dueDate || stage === 'completed') return false;
  const dueStr = typeof dueDate === 'string' ? dueDate.slice(0, 10) : dueDate.toISOString().slice(0, 10);
  const nowStr = now.toISOString().slice(0, 10);
  return dueStr < nowStr;
}

export function formatAllocatedMinutes(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export function parseDurationToMinutes(input: string | number): number | null {
  if (typeof input === 'number') {
    return input > 0 ? Math.round(input) : null;
  }
  if (!input || !input.trim()) return null;
  const trimmed = input.trim().toLowerCase();
  
  // Format "2h 30m" or "2h" or "30m"
  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/);
  const minMatch = trimmed.match(/(\d+)\s*m/);

  if (hourMatch || minMatch) {
    const hours = hourMatch ? parseFloat(hourMatch[1]) : 0;
    const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
    const total = Math.round(hours * 60 + mins);
    return total > 0 ? total : null;
  }

  const plainNum = parseFloat(trimmed);
  if (!isNaN(plainNum) && plainNum > 0) {
    return Math.round(plainNum);
  }

  return null;
}
