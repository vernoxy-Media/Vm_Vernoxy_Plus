import React, { useMemo } from 'react';
import { TaskFormModal } from '@/features/tasks/components/TaskFormModal';
import type { CreateProjectTaskPayload, ProjectMember, SprintItem } from '../types';

interface CreateProjectTaskModalProps {
  projectId: number;
  projectMembers: ProjectMember[];
  sprints: SprintItem[];
  defaultSprintId?: number | null;
  projectDeadline?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateProjectTaskPayload) => Promise<void>;
}

/**
 * Project Task (Project BFD 2.7): the same form and rules as Create Task in the
 * Task Module (sub tasks and Lead included), plus Sprint. Assigned To lists only
 * the employees of the project.
 */
export const CreateProjectTaskModal: React.FC<CreateProjectTaskModalProps> = ({
  projectMembers,
  sprints,
  defaultSprintId,
  projectDeadline,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const employees = useMemo(
    () =>
      Array.from(new Map(projectMembers.map((m) => [m.employee_id, m])).values()).map((m) => ({
        emp_id: m.employee_id,
        name: m.name,
        email: m.email,
        avatar_url: m.profile_picture ?? null,
        role_name: m.role_in_project,
      })),
    [projectMembers],
  );
  const sprintOptions = useMemo(() => sprints.map((s) => ({ id: s.sprint_id, label: s.sprint_name })), [sprints]);

  return (
    <TaskFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={(data) => onSubmit(data as unknown as CreateProjectTaskPayload)}
      employees={employees}
      taskTypeOptions={[]}
      title="Create issue"
      mode="project"
      sprintOptions={sprintOptions}
      defaultSprintId={defaultSprintId ?? null}
      projectDeadline={projectDeadline}
    />
  );
};
