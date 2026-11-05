import React from 'react';
import { CreateTaskDto } from '@vernoxy-pulse/api-client';
import { TaskFormModal } from './TaskFormModal';

export interface QuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskDto) => Promise<void>;
  taskTypeOptions: { id: number; label: string }[];
}

/**
 * Task created by an employee (Task BFD 3.5): the same fields as Create Task,
 * except Assigned To. Visible only to the employee and the Admin.
 */
export const QuickTaskModal: React.FC<QuickTaskModalProps> = ({ isOpen, onClose, onSubmit, taskTypeOptions }) => (
  <TaskFormModal
    isOpen={isOpen}
    onClose={onClose}
    onSubmit={onSubmit}
    taskTypeOptions={taskTypeOptions}
    title="Add Quick Task"
    mode="quick"
  />
);
