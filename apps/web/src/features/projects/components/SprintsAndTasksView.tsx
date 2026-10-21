import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Flag,
  Calendar,
  Filter,
  CheckSquare,
} from 'lucide-react';
import type {
  ProjectItem,
  SprintItem,
  ProjectTaskItem,
  CreateSprintPayload,
  CreateProjectTaskPayload,
  SprintStatus,
} from '../types';
import {
  fetchProjectSprints,
  createSprint,
  updateSprint,
  fetchSprintTasks,
  createProjectTask,
} from '../api/projects.api';
import { CreateSprintModal } from './CreateSprintModal';
import { CreateProjectTaskModal } from './CreateProjectTaskModal';

interface SprintsAndTasksViewProps {
  project: ProjectItem;
  canManageSprints?: boolean;
}

export const SprintsAndTasksView: React.FC<SprintsAndTasksViewProps> = ({
  project,
  canManageSprints = true,
}) => {
  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [tasks, setTasks] = useState<ProjectTaskItem[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<number | 'all'>('all');
  const [filterEmployeeId, setFilterEmployeeId] = useState<number | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [sprintList, taskList] = await Promise.all([
        fetchProjectSprints(project.project_id),
        fetchSprintTasks(project.project_id),
      ]);
      setSprints(sprintList);
      setTasks(taskList);

      // Default select the first active/in_progress sprint, or first sprint, or 'all'
      if (sprintList.length > 0) {
        const active = sprintList.find((s) => s.status === 'in_progress');
        setSelectedSprintId(active ? active.sprint_id : sprintList[0].sprint_id);
      } else {
        setSelectedSprintId('all');
      }
    } catch (err) {
      console.error('Failed to load sprints and tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (project?.project_id) {
      loadData();
    }
  }, [project.project_id]);

  const handleCreateSprint = async (payload: CreateSprintPayload) => {
    await createSprint(project.project_id, payload);
    await loadData();
  };

  const handleUpdateSprintStatus = async (sprintId: number, newStatus: SprintStatus) => {
    try {
      await updateSprint(project.project_id, sprintId, { status: newStatus });
      await loadData();
    } catch (err) {
      console.error('Failed to update sprint status:', err);
    }
  };

  const handleCreateTask = async (payload: CreateProjectTaskPayload) => {
    await createProjectTask(project.project_id, payload);
    await loadData();
  };

  const selectedSprint = useMemo(() => {
    if (selectedSprintId === 'all') return null;
    return sprints.find((s) => s.sprint_id === selectedSprintId) || null;
  }, [sprints, selectedSprintId]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (selectedSprintId !== 'all') {
      result = result.filter((t) => t.sprint_id === selectedSprintId);
    }
    if (filterEmployeeId !== 'all') {
      result = result.filter((t) =>
        t.assignees.some((a) => a.emp_id === filterEmployeeId)
      );
    }
    return result;
  }, [tasks, selectedSprintId, filterEmployeeId]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const formatMinutes = (minutes?: number | null) => {
    if (!minutes || minutes <= 0) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Flag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Sprints & Project Tasks
            </h3>
            <p className="text-[11px] text-slate-500">
              Manage sprint deliverables, task assignments, and completion progress
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManageSprints && (
            <>
              <button
                type="button"
                onClick={() => setIsSprintModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Sprint
              </button>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Project Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left Column: Sprints List */}
        <div className="md:col-span-4 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Sprints ({sprints.length})
            </span>
          </div>

          <div className="space-y-2">
            {/* "All Sprints / Backlog" card */}
            <div
              onClick={() => setSelectedSprintId('all')}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                selectedSprintId === 'all'
                  ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-400/50 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">All Project Tasks</span>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {tasks.length} tasks
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                View all tasks across active and upcoming sprints
              </p>
            </div>

            {sprints.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-200">
                <Flag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No sprints created yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Start by adding your first sprint milestone
                </p>
                {canManageSprints && (
                  <button
                    type="button"
                    onClick={() => setIsSprintModalOpen(true)}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                  >
                    <Plus className="w-3 h-3" />
                    Create Sprint
                  </button>
                )}
              </div>
            ) : (
              sprints.map((sprint) => {
                const isSelected = selectedSprintId === sprint.sprint_id;
                const statusColors = {
                  planned: 'bg-amber-50 text-amber-700 border-amber-200',
                  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
                  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                };

                return (
                  <div
                    key={sprint.sprint_id}
                    onClick={() => setSelectedSprintId(sprint.sprint_id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {sprint.sprint_name}
                        </h4>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
                        </span>
                      </div>
                      <select
                        onClick={(e) => e.stopPropagation()}
                        value={sprint.status}
                        onChange={(e) =>
                          handleUpdateSprintStatus(
                            sprint.sprint_id,
                            e.target.value as SprintStatus
                          )
                        }
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          statusColors[sprint.status]
                        }`}
                      >
                        <option value="planned">Planned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    {/* Progress Bar & Counter */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-500 font-medium">
                          {sprint.completed_tasks_count}/{sprint.total_tasks_count} tasks
                        </span>
                        <span className="text-blue-600 font-bold">
                          {sprint.progress_percentage}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, sprint.progress_percentage))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Sprint Tasks Table & Filter */}
        <div className="md:col-span-8 space-y-3">
          {/* Header & Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>{selectedSprint ? selectedSprint.sprint_name : 'All Project Tasks'}</span>
                {selectedSprint && (
                  <span className="text-[10px] font-normal text-slate-500">
                    ({selectedSprint.completed_tasks_count}/{selectedSprint.total_tasks_count} completed)
                  </span>
                )}
              </h4>
              {selectedSprint?.sprint_goal && (
                <p className="text-[11px] text-slate-500 mt-0.5 italic">
                  Goal: "{selectedSprint.sprint_goal}"
                </p>
              )}
            </div>

            {/* Employee Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <Filter className="w-3 h-3" />
                Assignee:
              </span>
              <select
                value={filterEmployeeId}
                onChange={(e) =>
                  setFilterEmployeeId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Members</option>
                {project.members.map((m) => (
                  <option key={m.member_id} value={m.employee_id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tasks Table / Cards */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading tasks...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-8 text-center">
                <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No tasks found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedSprintId !== 'all'
                    ? 'This sprint has no assigned tasks yet.'
                    : 'No project tasks have been added.'}
                </p>
                {canManageSprints && (
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(true)}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add First Task
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const rawPriority = (task.priority || 'medium').toLowerCase();
                  const rawStatus = (task.status || task.stage || 'assigned').toLowerCase();

                  const priorityColors: Record<string, string> = {
                    low: 'text-slate-600 bg-slate-100',
                    medium: 'text-blue-700 bg-blue-50',
                    high: 'text-amber-700 bg-amber-50',
                    urgent: 'text-rose-700 bg-rose-50',
                  };

                  const statusColors: Record<string, string> = {
                    todo: 'text-slate-600 bg-slate-100',
                    assigned: 'text-slate-600 bg-slate-100',
                    in_progress: 'text-blue-700 bg-blue-50',
                    submitted: 'text-indigo-700 bg-indigo-50',
                    approved: 'text-emerald-700 bg-emerald-50',
                    completed: 'text-emerald-700 bg-emerald-50',
                    rejected: 'text-rose-700 bg-rose-50',
                  };

                  const priorityColor = priorityColors[rawPriority] || 'text-slate-600 bg-slate-100';
                  const statusColor = statusColors[rawStatus] || 'text-slate-600 bg-slate-100';

                  return (
                    <div
                      key={task.task_id}
                      className="p-3.5 hover:bg-slate-50/70 transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${priorityColor}`}
                          >
                            {rawPriority}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${statusColor}`}
                          >
                            {rawStatus.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <h5 className="font-semibold text-slate-900 truncate">{task.title}</h5>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Right Meta details: Assignees, Due Date, Allocated Time */}
                      <div className="flex items-center gap-4 flex-shrink-0 text-[11px]">
                        {/* Assignee badges */}
                        <div className="flex items-center -space-x-1">
                          {(task.assignees || []).map((a) => (
                            <div
                              key={a.emp_id}
                              title={a.name}
                              className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white text-[10px] font-bold text-slate-700 flex items-center justify-center uppercase shadow-xs"
                            >
                              {(a.name || 'U').charAt(0)}
                            </div>
                          ))}
                        </div>

                        {/* Due Date */}
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Due Date</span>
                          <span className="font-medium text-slate-700">
                            {formatDate(task.due_date)}
                          </span>
                        </div>

                        {/* Allocated Time */}
                        <div className="text-right min-w-[50px]">
                          <span className="text-[10px] text-slate-400 block">Time</span>
                          <span className="font-medium text-slate-700">
                            {formatMinutes(task.allocated_minutes)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateSprintModal
        projectId={project.project_id}
        projectStartDate={project.start_date}
        projectDeadline={project.deadline}
        isOpen={isSprintModalOpen}
        onClose={() => setIsSprintModalOpen(false)}
        onSubmit={handleCreateSprint}
      />

      <CreateProjectTaskModal
        projectId={project.project_id}
        projectMembers={project.members}
        sprints={sprints}
        defaultSprintId={selectedSprintId !== 'all' ? selectedSprintId : null}
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateTask}
      />
    </div>
  );
};
