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

  // Section 3.3 BFD State Machine
  if (fromStage === 'assigned') {
    if (toStage === 'in_progress' || toStage === 'hold') return { allowed: true };
    return { allowed: false, reason: 'To Do tasks can only move to "In Progress" or "Hold"' };
  }

  if (fromStage === 'in_progress') {
    if (toStage === 'hold' || toStage === 'requested') return { allowed: true };
    return { allowed: false, reason: 'In Progress tasks can only move to "Hold" or "Submitted"' };
  }

  if (fromStage === 'hold') {
    if (toStage === 'assigned' || toStage === 'in_progress') return { allowed: true };
    return { allowed: false, reason: 'Hold tasks can only move to "To Do" or "In Progress"' };
  }

  if (fromStage === 'requested') {
    if (toStage === 'in_progress') return { allowed: true };
    if (toStage === 'completed') {
      if (!isAdmin) {
        return { allowed: false, reason: 'Only administrators or project managers can approve tasks' };
      }
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Submitted tasks can only move to "In Progress" (rework) or "Approved"',
    };
  }

  if (fromStage === 'completed') {
    return { allowed: false, reason: 'Approved tasks are locked and cannot be moved to any stage' };
  }

  return { allowed: false, reason: `Unsupported stage transition from "${fromStage}" to "${toStage}"` };
}

export interface SubTaskInput {
  title: string;
  allocated_minutes?: number | null;
  assignee_ids: number[];
}

export function validateSubTasks(
  mainAllocatedMinutes: number | null | undefined,
  subTasks: SubTaskInput[],
  mainAssigneeIds: number[],
): { valid: boolean; error?: string } {
  if (!subTasks || subTasks.length === 0) {
    return { valid: true };
  }

  const mainMins = mainAllocatedMinutes || 0;
  if (mainMins <= 0) {
    return { valid: false, error: 'Main task allocated time is required when adding sub tasks' };
  }

  let totalSubMinutes = 0;
  const mainAssigneeSet = new Set(mainAssigneeIds);

  for (let i = 0; i < subTasks.length; i++) {
    const st = subTasks[i]!;
    if (!st.title || !st.title.trim()) {
      return { valid: false, error: `Sub task #${i + 1} must have a name` };
    }

    const subMins = st.allocated_minutes || 0;
    if (subMins <= 0) {
      return { valid: false, error: `Sub task "${st.title}" must have an allocated time greater than zero` };
    }
    if (subMins > mainMins) {
      return { valid: false, error: `Sub task "${st.title}" cannot be longer than the main task (${formatAllocatedMinutes(mainMins)})` };
    }
    totalSubMinutes += subMins;

    if (!st.assignee_ids || st.assignee_ids.length === 0) {
      return { valid: false, error: `Sub task "${st.title}" must be assigned to at least one employee` };
    }

    for (const empId of st.assignee_ids) {
      if (!mainAssigneeSet.has(empId)) {
        return { valid: false, error: `Sub task assignee must be selected from the main task assignees` };
      }
    }
  }

  if (totalSubMinutes !== mainMins) {
    return {
      valid: false,
      error: `Total time of all sub tasks (${formatAllocatedMinutes(totalSubMinutes)}) must be equal to the Allocated Time of the main task (${formatAllocatedMinutes(mainMins)})`,
    };
  }

  return { valid: true };
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
