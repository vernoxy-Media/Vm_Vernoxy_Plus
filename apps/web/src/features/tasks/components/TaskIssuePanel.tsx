import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FolderKanban, Loader2, Zap } from 'lucide-react';
import type { TaskDetailDto } from '@vernoxy-pulse/api-client';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ProjectIssueView } from '@/features/projects/components/ProjectIssueView';
import type { TaskStage } from '../types';

interface TaskIssuePanelProps {
  task: TaskDetailDto | null;
  isOpen: boolean;
  /** Admin: approves and sends back work in review, edits the task and changes its dates. */
  isAdmin: boolean;
  /** Where the user came from, shown at the start of the breadcrumb ("My tasks", "Task management"). */
  heading: string;
  onClose: () => void;
  onEdit?: (task: TaskDetailDto) => void;
  onMoveStage: (taskId: number, stage: TaskStage, note?: string, holdReason?: string) => void | Promise<void>;
  onTrackWorkSession: (taskId: number, action: 'start' | 'pause' | 'finish', note?: string) => void | Promise<void>;
  onChangeDate?: (taskId: number, field: 'start_date' | 'due_date', date: string | null) => Promise<void>;
}

/**
 * The task opened from My Tasks or Task Management: the same Jira issue view the projects use, in a side panel.
 * Description, child issues, work log, history and the Details and Time tracking panels are all there.
 */
export const TaskIssuePanel: React.FC<TaskIssuePanelProps> = ({ task, isOpen, isAdmin, heading, onClose, onEdit, onMoveStage, onTrackWorkSession, onChangeDate }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(9,30,66,0.54)]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-label="Task details" className="flex h-full w-screen flex-col bg-white shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)] animate-in slide-in-from-right duration-200 sm:max-w-3xl xl:max-w-[1100px]">
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {task && (task.project_id || task.source === 'quick') && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
              {task.project_id ? (
                <Link
                  to={`/projects/${task.project_id}?task=${task.task_id}`}
                  className="inline-flex items-center gap-1.5 rounded-[3px] bg-[#DEEBFF] px-2 py-1 font-medium text-[#0747A6] hover:bg-[#B3D4FF]"
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                  {task.project_no ? `${task.project_no} · ` : ''}{task.project_name || 'Project'}
                  <ExternalLink className="h-3 w-3" /> Open in project
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-[3px] bg-[#FFF0B3] px-2 py-1 font-medium text-[#172B4D]">
                  <Zap className="h-3.5 w-3.5" /> Quick task: only you see it
                </span>
              )}
              {task.parent_task_id && task.parent_task_code && (
                <span className="text-[#5E6C84]">Sub-task of {task.parent_task_code}{task.parent_task_title ? ` · ${task.parent_task_title}` : ''}</span>
              )}
            </div>
          )}
          {task ? (
            <ProjectIssueView
              key={task.task_id}
              task={task}
              projectName={task.project_name || heading}
              isAdmin={isAdmin}
              canApprove={isAdmin}
              currentEmpId={user?.emp_id}
              members={[]}
              comments={[]}
              canEditDates={isAdmin}
              onClose={onClose}
              onEdit={isAdmin ? onEdit : undefined}
              onMoveStage={onMoveStage}
              onTrackWorkSession={async (id, action, note) => { await onTrackWorkSession(id, action, note); }}
              onChangeDate={onChangeDate}
            />
          ) : (
            <div className="flex h-64 items-center justify-center gap-2 text-[14px] text-[#5E6C84]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading task…
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
