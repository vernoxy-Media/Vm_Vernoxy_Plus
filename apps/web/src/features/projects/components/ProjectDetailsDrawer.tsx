import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  MessageSquare,
  History,
  Edit3,
  AlertCircle,
  Bug,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { CalendarRange, KanbanSquare, ListTodo, Timer } from 'lucide-react';
import { ProjectDateRange, ProjectTimelineView } from './ProjectTimelineView';
import { ProjectWorkspaceNav, type WorkspaceNavGroup } from './ProjectWorkspaceNav';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useSocket } from '@/shared/socket/SocketContext';
import {
  fetchProjectDetail,
  updateProject,
  updateProjectStatus,
  fetchProjectSprints,
  createSprint,
  fetchSprintTasks,
  updateSprint,
  completeSprint,
  addSubTask,
  fetchDeliveryReadiness,
  moveTaskToSprint,
  createProjectTask,
  fetchProjectDiscussions,
  createProjectDiscussion,
  fetchProjectActivityLogs,
  fetchProjectBugs,
  createProjectBug,
  fetchAssignableEmployees,
} from '../api/projects.api';
import { customFetch } from '@vernoxy-pulse/api-client';
import type {
  AssignableEmployee,
  CreateProjectBugPayload,
  CreateProjectTaskPayload,
  CreateSprintPayload,
  DeliveryReadiness,
  ProjectActivityLogItem,
  ProjectBugItem,
  ProjectDiscussionItem,
  ProjectItem,
  ProjectStatus,
  ProjectTaskItem,
  SprintItem,
} from '../types';
import type { TaskStage } from '../../tasks/types';
import { CreateSprintModal } from './CreateSprintModal';
import { ProjectSprintBoard } from './ProjectSprintBoard';
import { ProjectComments } from './ProjectComments';
import { ProjectIssueView } from './ProjectIssueView';
import { AddSubTaskModal } from './AddSubTaskModal';
import { EmployeeFilter } from './EmployeeFilter';
import { DeliverProjectDialog } from './DeliverProjectDialog';
import { ProjectTimeReport } from './ProjectTimeReport';
import { ProjectBugsView } from './ProjectBugsView';
import { ProjectSummaryView } from './ProjectSummaryView';
import { ProjectStatusMenu } from './ProjectStatusMenu';
import { TaskFormModal } from '@/features/tasks/components/TaskFormModal';
import { CreateProjectTaskModal } from './CreateProjectTaskModal';
import { CreateBugModal } from './CreateBugModal';
import { BugDetailsModal } from './BugDetailsModal';
import { CreateProjectModal } from './CreateProjectModal';
import type { TaskDetailDto } from '@vernoxy-pulse/api-client';

const STATUS_CONFIGS: Record<ProjectStatus, { label: string; bg: string; text: string; dot: string }> = {
  new: { label: 'New', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  planning: { label: 'Planning', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  pending: { label: 'Pending', bg: 'bg-slate-100 text-slate-700 border-slate-300', text: 'text-slate-700', dot: 'bg-slate-400' },
  review: { label: 'Review', bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  on_hold: { label: 'On Hold', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50 text-red-700 border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
};

export interface ProjectDetailsDrawerProps {
  projectId: number | null;
  isOpen: boolean;
  /** Open this task or bug as soon as the project opens (deep links). */
  initialTaskId?: number | null;
  initialBugId?: number | null;
  onClose: () => void;
  onProjectUpdated?: () => void;
}

export const ProjectDetailsDrawer: React.FC<ProjectDetailsDrawerProps> = ({
  projectId,
  isOpen,
  initialTaskId,
  initialBugId,
  onClose,
  onProjectUpdated,
}) => {
  const { user } = useAuth();
  // Admin = role marked is_admin (same rule as the API).
  const isAdmin = Boolean(user?.access?.can_manage_organization);

  const { socket, joinProject, leaveProject } = useSocket();

  // Core Data
  const [project, setProject] = useState<ProjectItem | null>(null);
  const isProjectManager = Boolean(
    project?.project_manager_id && project.project_manager_id === user?.emp_id
  );
  const isManagerOrAdmin = isAdmin || isProjectManager;

  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [tasks, setTasks] = useState<ProjectTaskItem[]>([]);
  const [bugs, setBugs] = useState<ProjectBugItem[]>([]);
  const [discussions, setDiscussions] = useState<ProjectDiscussionItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ProjectActivityLogItem[]>([]);
  const [employees, setEmployees] = useState<AssignableEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Final 4 Tabs: Tasks, Discussion, Overview, Activity Logs
  const [activeTab, setActiveTab] = useState<'tasks' | 'timeline' | 'timelog' | 'discussion' | 'overview' | 'activity'>('tasks');
  const [tasksSubTab, setTasksSubTab] = useState<'board' | 'bugs'>('board');

  // Filters
  const [selectedEmpFilter, setSelectedEmpFilter] = useState('all');
  const [selectedSprintFilter, setSelectedSprintFilter] = useState<string>('all');

  // Dedicated Bug Tab Filters

  // Modals
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalSprintId, setTaskModalSprintId] = useState<number | null>(null);
  const [boardView, setBoardView] = useState<'board' | 'list'>('board');
  const [editTask, setEditTask] = useState<TaskDetailDto | null>(null);
  const [childOf, setChildOf] = useState<TaskDetailDto | null>(null);
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [selectedBugId, setSelectedBugId] = useState<number | null>(null);
  const [selectedDrawerTaskId, setSelectedDrawerTaskId] = useState<number | null>(null);
  const [drawerTaskDetail, setDrawerTaskDetail] = useState<TaskDetailDto | null>(null);

  // Status Change State
  const [targetStatusChange, setTargetStatusChange] = useState<ProjectStatus | null>(null);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryReadiness | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);




  // Load All Project Data
  const loadProjectData = useCallback(async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      setError(null);
      const [pData, sData, tData, dData, aData, bData, empData] = await Promise.all([
        fetchProjectDetail(projectId),
        fetchProjectSprints(projectId),
        fetchSprintTasks(projectId),
        fetchProjectDiscussions(projectId),
        fetchProjectActivityLogs(projectId),
        fetchProjectBugs(projectId),
        fetchAssignableEmployees(),
      ]);

      setProject(pData);
      setSprints(sData);
      setTasks(tData);
      setDiscussions(dData);
      setActivityLogs(aData);
      setBugs(bData);
      setEmployees(empData);
    } catch (err: any) {
      console.error('Failed to load project details:', err);
      setError('Could not load project details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && projectId) {
      loadProjectData();
    }
  }, [isOpen, projectId, loadProjectData]);

  // Real-time WebSocket Listeners
  useEffect(() => {
    if (!isOpen || !projectId || !socket) return;
    joinProject(projectId);

    const handleTaskUpdated = (payload: any) => {
      if (payload?.projectId === projectId) {
        fetchSprintTasks(projectId).then(setTasks);
      }
    };
    const handleSprintUpdated = (payload: any) => {
      if (payload?.projectId === projectId) {
        fetchProjectSprints(projectId).then(setSprints);
      }
    };
    const handleDiscussionAdded = (payload: any) => {
      if (payload?.projectId === projectId) {
        fetchProjectDiscussions(projectId).then(setDiscussions);
      }
    };
    const handleActivityLogged = (payload: any) => {
      if (payload?.projectId === projectId) {
        fetchProjectActivityLogs(projectId).then(setActivityLogs);
      }
    };
    const handleBugUpdated = (payload: any) => {
      if (payload?.projectId === projectId) {
        fetchProjectBugs(projectId).then(setBugs);
      }
    };

    socket.on('project:task_updated', handleTaskUpdated);
    socket.on('project:sprint_updated', handleSprintUpdated);
    socket.on('project:discussion_added', handleDiscussionAdded);
    socket.on('project:activity_logged', handleActivityLogged);
    socket.on('project:bug_updated', handleBugUpdated);

    return () => {
      leaveProject(projectId);
      socket.off('project:task_updated', handleTaskUpdated);
      socket.off('project:sprint_updated', handleSprintUpdated);
      socket.off('project:discussion_added', handleDiscussionAdded);
      socket.off('project:activity_logged', handleActivityLogged);
      socket.off('project:bug_updated', handleBugUpdated);
    };
  }, [isOpen, projectId, socket, joinProject, leaveProject]);

  // What is still open before delivery (admin and project manager), kept fresh as the work changes
  useEffect(() => {
    if (!isOpen || !projectId || !isManagerOrAdmin) return;
    let live = true;
    fetchDeliveryReadiness(projectId).then((d) => live && setDelivery(d)).catch(() => live && setDelivery(null));
    return () => {
      live = false;
    };
  }, [isOpen, projectId, isManagerOrAdmin, tasks, bugs, sprints, project?.project_status]);

  // Every project opens on its board with clean filters (state would otherwise carry over)
  useEffect(() => {
    setSelectedSprintFilter('all');
    setSelectedEmpFilter('all');
    setActiveTab('tasks');
    setTasksSubTab('board');
    setBoardView('board');
    setSelectedDrawerTaskId(null);
    setSelectedBugId(null);
  }, [projectId, isOpen]);

  // A link to one issue opens it on top of the board
  useEffect(() => {
    if (!isOpen || !projectId) return;
    if (initialTaskId) setSelectedDrawerTaskId(initialTaskId);
    if (initialBugId) setSelectedBugId(initialBugId);
  }, [projectId, isOpen, initialTaskId, initialBugId]);

  // Load Task Drawer Details
  useEffect(() => {
    if (!selectedDrawerTaskId) {
      setDrawerTaskDetail(null);
      return;
    }
    const loadTask = async () => {
      try {
        const url = isAdmin
          ? `/api/v1/admin/tasks/${selectedDrawerTaskId}`
          : `/api/v1/my-tasks/${selectedDrawerTaskId}`;
        const res = await customFetch<any>(url);
        setDrawerTaskDetail(res?.data || res);
      } catch (err) {
        console.error('Failed to load task drawer details:', err);
      }
    };
    loadTask();
  }, [selectedDrawerTaskId, isAdmin, tasks]);

  // KPI Calculations
  // The employee filter (admin and project manager) narrows every view, not only the board
  const empId = selectedEmpFilter === 'all' ? null : Number(selectedEmpFilter);
  const empTasks = useMemo(() => (empId === null ? tasks : tasks.filter((t) => t.assignees?.some((a) => a.emp_id === empId))), [tasks, empId]);
  const empBugs = useMemo(() => (empId === null ? bugs : bugs.filter((b) => b.assigned_to === empId || b.reported_by === empId)), [bugs, empId]);

  const kpiData = useMemo(() => {
    if (!project) return { estHours: 0, actHours: 0, startDate: '', deadline: '', actualEndDate: null };

    const estHours = project.total_estimated_minutes
      ? Math.round(((project.total_estimated_minutes || 0) / 60) * 10) / 10
      : 0;
    const actSeconds = empTasks.reduce((acc, t) => acc + (t.logged_seconds ?? ((t as any).actual_minutes || 0) * 60), 0);
    const actHours = Math.round((actSeconds / 3600) * 10) / 10;

    return {
      estHours,
      actHours,
      startDate: project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB') : '---',
      deadline: project.deadline ? new Date(project.deadline).toLocaleDateString('en-GB') : '---',
      actualEndDate: project.actual_end_date ? new Date(project.actual_end_date).toLocaleDateString('en-GB') : null,
    };
  }, [project, empTasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedSprintFilter !== 'all' && String(t.sprint_id) !== selectedSprintFilter) {
        return false;
      }
      if (selectedEmpFilter !== 'all') {
        const hasAssignee = t.assignees?.some((a) => String(a.emp_id) === selectedEmpFilter);
        if (!hasAssignee) return false;
      }
      return true;
    });
  }, [tasks, selectedSprintFilter, selectedEmpFilter]);

  // Person-wise Workload Analytics
  const personWiseSummary = useMemo(() => {
    if (!project?.members) return [];
    return project.members
      .filter((m) => selectedEmpFilter === 'all' || String(m.employee_id) === selectedEmpFilter)
      .map((member) => {
        const memberTasks = tasks.filter((t) =>
          t.assignees?.some((a) => a.emp_id === member.employee_id)
        );

        const totalTasks = memberTasks.length;
        const completedTasks = memberTasks.filter((t) => t.stage === 'completed').length;
        const estMinutes = memberTasks.reduce((sum, t) => sum + (t.allocated_minutes || 0), 0);
        // What this person logged themselves; a task shared by two people is not counted twice
        const actSeconds = tasks.reduce((sum, t) => sum + (t.time_by_employee?.find((x) => x.employee_id === member.employee_id)?.seconds ?? 0), 0);

        return {
          emp_id: member.employee_id,
          name: member.name,
          email: member.email,
          role: member.role_in_project || 'Member',
          totalTasks,
          completedTasks,
          estHours: (estMinutes / 60).toFixed(1),
          actHours: (actSeconds / 3600).toFixed(1),
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        };
      });
  }, [project, tasks, selectedEmpFilter]);

  // Status Update Handlers
  /** Delivery closes the project, so it goes through its own checklist first. */
  const deliverProject = async (reason: string | undefined, force: boolean) => {
    if (!projectId) return;
    await updateProjectStatus(projectId, 'delivered', reason, force);
    await loadProjectData();
    onProjectUpdated?.();
  };

  const promptStatusChange = (newStatus: ProjectStatus) => {
    if (newStatus === 'delivered') {
      setDeliverOpen(true);
      return;
    }
    if (['on_hold', 'cancelled'].includes(newStatus)) {
      setTargetStatusChange(newStatus);
      setStatusReason('');
    } else {
      executeStatusUpdate(newStatus);
    }
  };

  const executeStatusUpdate = async (newStatus: ProjectStatus, reason?: string) => {
    if (!projectId) return;
    try {
      setIsSubmittingStatus(true);
      await updateProjectStatus(projectId, newStatus, reason);
      setTargetStatusChange(null);
      setStatusReason('');
      await loadProjectData();
      onProjectUpdated?.();
    } catch (err: any) {
      console.error(err);
      alert(err?.detail || err?.message || 'Failed to update project status');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Drag-and-drop Move Stage
  const handleMoveStage = async (
    taskId: number,
    targetStage: TaskStage,
    note?: string,
    holdReason?: string
  ) => {
    setTasks((prev) =>
      prev.map((t) => (t.task_id === taskId ? { ...t, stage: targetStage } : t))
    );

    try {
      const url = isAdmin
        ? `/api/v1/admin/tasks/${taskId}/move`
        : `/api/v1/my-tasks/${taskId}/move`;

      await customFetch(url, {
        method: 'POST',
        body: JSON.stringify({ target_stage: targetStage, note, hold_reason: holdReason }),
        headers: { 'Content-Type': 'application/json' },
      });

      const updated = await fetchSprintTasks(projectId!);
      setTasks(updated);
    } catch (err) {
      console.error('Failed to move stage:', err);
      const reverted = await fetchSprintTasks(projectId!);
      setTasks(reverted);
    }
  };

  // Modals Submit Handlers
  const handleCreateSprint = async (payload: CreateSprintPayload) => {
    if (!projectId) return;
    await createSprint(projectId, payload);
    const updated = await fetchProjectSprints(projectId);
    setSprints(updated);
  };

  const handleCreateTask = async (payload: CreateProjectTaskPayload) => {
    if (!projectId) return;
    await createProjectTask(projectId, payload);
    const updated = await fetchSprintTasks(projectId);
    setTasks(updated);
  };

  const taskUrl = (id: number) => (isAdmin ? `/api/v1/admin/tasks/${id}` : `/api/v1/my-tasks/${id}`);

  const reloadTaskDetail = async (id: number) => {
    const res = await customFetch<any>(taskUrl(id));
    setDrawerTaskDetail(res?.data || res);
  };

  /** Stage change from the issue view. Unlike the board's version this reports failures. */
  const moveStageStrict = async (taskId: number, stage: TaskStage, note?: string, holdReason?: string) => {
    await customFetch(`${taskUrl(taskId)}/move`, {
      method: 'POST',
      body: JSON.stringify({ target_stage: stage, note, hold_reason: holdReason }),
      headers: { 'Content-Type': 'application/json' },
    });
    await refreshPlanning();
    if (selectedDrawerTaskId) await reloadTaskDetail(selectedDrawerTaskId);
  };

  /** Change or clear a start or due date straight from the issue view. */
  const changeDate = async (taskId: number, field: 'start_date' | 'due_date', date: string | null) => {
    await customFetch(taskUrl(taskId), {
      method: 'PATCH',
      body: JSON.stringify({ [field]: date }),
      headers: { 'Content-Type': 'application/json' },
    });
    await refreshPlanning();
    if (selectedDrawerTaskId) await reloadTaskDetail(selectedDrawerTaskId);
  };

  const trackSessionStrict = async (taskId: number, action: 'start' | 'pause' | 'finish', note?: string) => {
    await customFetch(`${taskUrl(taskId)}/work-session`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
      headers: { 'Content-Type': 'application/json' },
    });
    await refreshPlanning();
    if (selectedDrawerTaskId) await reloadTaskDetail(selectedDrawerTaskId);
  };

  const refreshPlanning = async () => {
    if (!projectId) return;
    const [freshSprints, freshTasks] = await Promise.all([fetchProjectSprints(projectId), fetchSprintTasks(projectId)]);
    setSprints(freshSprints);
    setTasks(freshTasks);
  };

  const handleStartSprint = async (sprintId: number) => {
    if (!projectId) return;
    await updateSprint(projectId, sprintId, { status: 'active' });
    await refreshPlanning();
  };

  const handleCompleteSprint = async (sprintId: number, moveToSprintId: number | null) => {
    if (!projectId) return;
    await completeSprint(projectId, sprintId, moveToSprintId);
    // The finished sprint is no longer the one to look at; show where the unfinished work went.
    setSelectedSprintFilter(moveToSprintId ? String(moveToSprintId) : 'all');
    await refreshPlanning();
  };

  const handleMoveTaskToSprint = async (taskId: number, sprintId: number | null) => {
    if (!projectId) return;
    await moveTaskToSprint(projectId, taskId, sprintId);
    await refreshPlanning();
  };

  const handleCreateBug = async (payload: CreateProjectBugPayload) => {
    if (!projectId) return;
    await createProjectBug(projectId, payload);
    const updated = await fetchProjectBugs(projectId);
    setBugs(updated);
    setTasksSubTab('bugs');
  };

  const issuePrefix = drawerTaskDetail ? `[${drawerTaskDetail.task_code}] ` : '';
  const issueComments = drawerTaskDetail
    ? discussions.filter((d) => d.message.startsWith(issuePrefix)).map((d) => ({ ...d, message: d.message.slice(issuePrefix.length) }))
    : [];
  const issueSprintId = drawerTaskDetail ? tasks.find((t) => t.task_id === drawerTaskDetail.task_id)?.sprint_id : null;
  const issueSprintName = sprints.find((x) => x.sprint_id === issueSprintId)?.sprint_name ?? null;

  if (!isOpen || !projectId) return null;


  // Jira-style navigation: Board and Backlog are two views of the same work
  const navId =
    activeTab === 'tasks' ? (tasksSubTab === 'bugs' ? 'bugs' : boardView === 'list' ? 'backlog' : 'board') : activeTab;

  const goNav = (id: string) => {
    setSelectedDrawerTaskId(null);
    if (id === 'board' || id === 'backlog' || id === 'bugs') {
      setActiveTab('tasks');
      setTasksSubTab(id === 'bugs' ? 'bugs' : 'board');
      if (id !== 'bugs') setBoardView(id === 'backlog' ? 'list' : 'board');
    } else {
      setActiveTab(id as typeof activeTab);
    }
  };

  const navGroups: WorkspaceNavGroup[] = [
    {
      title: 'Planning',
      items: [
        { id: 'board', label: 'Board', icon: KanbanSquare },
        { id: 'backlog', label: 'Backlog', icon: ListTodo, badge: filteredTasks.length },
        { id: 'timeline', label: 'Timeline', icon: CalendarRange },
      ],
    },
    {
      title: 'Work',
      items: [
        { id: 'bugs', label: 'Bugs', icon: Bug, badge: bugs.length },
        { id: 'discussion', label: 'Discussion', icon: MessageSquare, badge: discussions.length },
      ],
    },
    {
      title: 'Project',
      items: [
        { id: 'overview', label: 'Summary', icon: FileText },
        ...(isManagerOrAdmin ? [{ id: 'timelog', label: 'Time log', icon: Timer }] : []),
        { id: 'activity', label: 'Activity', icon: History, badge: activityLogs.length },
      ],
    },
  ];

  /** Activity grouped by day, newest first, like Jira's activity stream. */
  const activityByDay = (() => {
    const dayLabel = (iso: string) => {
      const d = new Date(iso);
      const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
      const diff = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const groups: Array<{ label: string; items: typeof activityLogs }> = [];
    [...activityLogs]
      .sort((x, y) => +new Date(y.created_at) - +new Date(x.created_at))
      .forEach((log) => {
        const label = dayLabel(log.created_at);
        const last = groups[groups.length - 1];
        if (last && last.label === label) last.items.push(log);
        else groups.push({ label, items: [log] });
      });
    return groups;
  })();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over panel on the right (same as image) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen sm:max-w-3xl xl:max-w-[1200px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-[#DFE1E6] h-full overflow-hidden">
          {isLoading && !project ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-slate-500 font-medium">Loading project view...</p>
            </div>
          ) : error || !project ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
              <h3 className="text-sm font-bold text-slate-900 mb-1">{error || 'Project not found'}</h3>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Header matching Image */}
              <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-[#DFE1E6] bg-white shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-[#5E6C84]">
                      {project.project_no}
                    </span>

                    {/* Status: a lozenge, with a menu when the user may change it */}
                    <ProjectStatusMenu
                      status={project.project_status}
                      canChange={isManagerOrAdmin}
                      onSelect={(st) => promptStatusChange(st)}
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsEditProjectModalOpen(true)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                        title="Edit Project Details & Team Members"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <h2 className="text-[24px] font-medium leading-8 text-[#172B4D] mt-1">
                  {project.project_name}
                </h2>
                <ProjectDateRange project={project} />
                {!isManagerOrAdmin && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-[#42526E]">
                    <span className="rounded-[3px] bg-[#DEEBFF] px-1.5 py-px text-[12px] font-semibold text-[#0747A6]">Your view</span>
                    You see only the work assigned to you in this project.
                  </p>
                )}
              </div>

              {/* Jira layout: project sidebar on large screens, tabs on small ones */}
              <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <ProjectWorkspaceNav
                projectName={project.project_name}
                projectKey={project.project_no}
                subtitle={project.project_type ? `${String(project.project_type).replace(/_/g, ' ')} project` : undefined}
                groups={navGroups}
                activeId={navId}
                onSelect={goNav}
              />

              {/* Page content */}
              <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {isManagerOrAdmin && (project.members?.length ?? 0) > 1 && (activeTab === 'timeline' || activeTab === 'timelog' || activeTab === 'overview' || (activeTab === 'tasks' && tasksSubTab === 'bugs' && selectedDrawerTaskId === null)) && (
                  <EmployeeFilter
                    people={Array.from(new Map((project.members ?? []).map((m) => [m.employee_id, m])).values()).map((m) => ({ id: m.employee_id, name: m.name, avatar: m.profile_picture }))}
                    value={selectedEmpFilter}
                    onChange={setSelectedEmpFilter}
                  />
                )}
                {/* 1. TAB: TASKS (Image 2 & 3) */}
                {activeTab === 'tasks' && (
                  <div className="space-y-4">
                    {/* If a task is selected, show embedded Task Details view (Image 2) */}
                    {selectedDrawerTaskId !== null && drawerTaskDetail ? (
                      <ProjectIssueView
                        key={drawerTaskDetail.task_id}
                        task={drawerTaskDetail}
                        projectName={project.project_name}
                        sprintName={issueSprintName}
                        isAdmin={isAdmin}
                        canApprove={isAdmin}
                        currentEmpId={user?.emp_id}
                        canManage={isManagerOrAdmin}
                        members={project.members || []}
                        comments={issueComments}
                        currentUserName={user?.name}
                        currentUserAvatar={(user as { profile_picture?: string | null } | null)?.profile_picture ?? null}
                        onClose={() => setSelectedDrawerTaskId(null)}
                        onEdit={isAdmin ? setEditTask : undefined}
                        onAddChild={setChildOf}
                        onOpenIssue={setSelectedDrawerTaskId}
                        projectDeadline={project.deadline}
                        canEditDates={isAdmin}
                        onChangeDate={changeDate}
                        onMoveStage={moveStageStrict}
                        onTrackWorkSession={trackSessionStrict}
                        onComment={async (message, taggedIds) => {
                          await createProjectDiscussion(projectId, `${issuePrefix}${message}`, undefined, taggedIds);
                          setDiscussions(await fetchProjectDiscussions(projectId));
                        }}
                      />
                    ) : (
                      /* Otherwise, show INDIVIDUAL LOGS list view (Image 3) */
                      <div className="space-y-4">
                        {tasksSubTab === 'bugs' && (
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-[20px] font-medium text-[#172B4D]">Bugs</h3>
                            <button
                              type="button"
                              onClick={() => setIsBugModalOpen(true)}
                              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] bg-[color:var(--ac-main,#0052CC)] px-3 text-[14px] font-medium text-white transition hover:bg-[color:var(--ac-hover,#0065FF)]"
                            >
                              <Bug className="h-4 w-4" />
                              <span>Report bug</span>
                            </button>
                          </div>
                        )}

                        {/* SUB-VIEW 1: Jira-style sprint board / backlog */}
                        {tasksSubTab === 'board' && (
                          <ProjectSprintBoard
                            tasks={tasks}
                            sprints={sprints}
                            members={project.members ?? []}
                            canManage={isManagerOrAdmin}
                            isAdmin={isAdmin}
                            currentEmpId={user?.emp_id}
                            view={boardView}
                            onViewChange={setBoardView}
                            sprintFilter={selectedSprintFilter}
                            onSprintFilter={setSelectedSprintFilter}
                            assigneeFilter={selectedEmpFilter}
                            onAssigneeFilter={setSelectedEmpFilter}
                            onOpenTask={setSelectedDrawerTaskId}
                            onAddTask={(sprintId) => {
                              setTaskModalSprintId(sprintId ?? null);
                              setIsTaskModalOpen(true);
                            }}
                            onAddSprint={() => setIsSprintModalOpen(true)}
                            onMoveStage={handleMoveStage}
                            onStartSprint={handleStartSprint}
                            onCompleteSprint={handleCompleteSprint}
                            onMoveToSprint={handleMoveTaskToSprint}
                          />
                        )}

                        {/* SUB-VIEW 2: Bugs */}
                        {tasksSubTab === 'bugs' && <ProjectBugsView bugs={empBugs} onOpenBug={setSelectedBugId} scopeNote={isManagerOrAdmin ? undefined : 'Showing the bugs assigned to you or reported by you.'} />}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. TAB: DISCUSSION (WhatsApp Chat Format with Emojis & Tag Notifications) */}
                {activeTab === 'discussion' && (
                  <ProjectComments
                    comments={discussions}
                    members={project.members || []}
                    currentUserId={user?.emp_id}
                    currentUserName={user?.name}
                    currentUserAvatar={(user as { profile_picture?: string | null } | null)?.profile_picture ?? null}
                    onSend={async (message, taggedIds) => {
                      await createProjectDiscussion(projectId, message, undefined, taggedIds);
                      const updated = await fetchProjectDiscussions(projectId);
                      setDiscussions(updated);
                    }}
                  />
                )}

                {/* TAB: TIMELINE */}
                {activeTab === 'timeline' && (
                  <ProjectTimelineView project={project} sprints={sprints} tasks={empTasks} bugs={empBugs} onOpenBug={setSelectedBugId} onOpenIssue={(id) => { setActiveTab('tasks'); setTasksSubTab('board'); setSelectedDrawerTaskId(id); }} />
                )}

                {/* TAB: TIME LOG (admin and project manager) */}
                {activeTab === 'timelog' && isManagerOrAdmin && (
                  <ProjectTimeReport
                    projectName={project.project_name}
                    sprints={sprints}
                    tasks={empTasks}
                    bugs={empBugs}
                    onOpenIssue={(id) => { setActiveTab('tasks'); setTasksSubTab('board'); setSelectedDrawerTaskId(id); }}
                  />
                )}

                {/* 3. TAB: SUMMARY */}
                {activeTab === 'overview' && (
                  <ProjectSummaryView
                    project={project}
                    tasks={empTasks}
                    kpi={kpiData}
                    workload={personWiseSummary}
                    canEdit={isAdmin}
                    canManageTeam={isManagerOrAdmin}
                    onEdit={() => setIsEditProjectModalOpen(true)}
                    delivery={isManagerOrAdmin ? delivery : null}
                    onDeliver={isManagerOrAdmin ? () => setDeliverOpen(true) : undefined}
                  />
                )}

                {/* 4. TAB: ACTIVITY */}
                {activeTab === 'activity' && (
                  <div className="mx-auto max-w-3xl">
                    <h3 className="mb-4 text-[20px] font-medium text-[#172B4D]">Activity</h3>
                    {activityLogs.length === 0 ? (
                      <div className="rounded-[3px] bg-[#F4F5F7] py-12 text-center text-[14px] text-[#5E6C84]">No activity recorded yet</div>
                    ) : (
                      activityByDay.map((day) => (
                        <section key={day.label} className="mb-6">
                          <h4 className="mb-1 text-[12px] font-bold uppercase tracking-[0.04em] text-[#5E6C84]">{day.label}</h4>
                          <ul className="divide-y divide-[#DFE1E6] border-y border-[#DFE1E6]">
                            {day.items.map((log) => (
                              <li key={log.log_id} className="flex items-start gap-3 py-3">
                                {log.actor_avatar ? (
                                  <img src={log.actor_avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                                ) : (
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--ac-main,#0052CC)] text-[12px] font-semibold text-white">
                                    {log.actor_name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'}
                                  </span>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-[14px] leading-5 text-[#172B4D]">
                                    <b className="font-semibold">{log.actor_name}</b> <span className="text-[#42526E]">{log.description}</span>
                                  </p>
                                  <p className="mt-0.5 text-[12px] text-[#5E6C84]">
                                    {new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))
                    )}
                  </div>
                )}
              </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateSprintModal
        projectId={projectId}
        projectStartDate={project?.start_date || ''}
        projectDeadline={project?.deadline || ''}
        isOpen={isSprintModalOpen}
        onClose={() => setIsSprintModalOpen(false)}
        onSubmit={handleCreateSprint}
      />

      <CreateProjectTaskModal
        projectId={projectId}
        projectMembers={project?.members || []}
        sprints={sprints}
        defaultSprintId={taskModalSprintId}
        projectDeadline={project?.deadline}
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateTask}
      />

      {deliverOpen && project && (
        <DeliverProjectDialog
          projectId={project.project_id}
          projectName={project.project_name}
          isAdmin={isAdmin}
          onClose={() => setDeliverOpen(false)}
          onConfirm={deliverProject}
        />
      )}

      <AddSubTaskModal
        parent={childOf}
        members={project?.members || []}
        projectDeadline={project?.deadline}
        onClose={() => setChildOf(null)}
        onSubmit={async (payload) => {
          if (!childOf || !projectId) return;
          await addSubTask(projectId, childOf.task_id, payload);
          await refreshPlanning();
          await reloadTaskDetail(childOf.task_id);
        }}
      />

      <TaskFormModal
        isOpen={editTask !== null}
        initialData={editTask}
        title="Edit issue"
        projectDeadline={project?.deadline}
        mode="project"
        taskTypeOptions={[]}
        employees={Array.from(new Map((project?.members || []).map((m) => [m.employee_id, m])).values()).map((m) => ({
          emp_id: m.employee_id,
          name: m.name,
          email: m.email,
          avatar_url: m.profile_picture ?? null,
          role_name: m.role_in_project,
        }))}
        sprintOptions={sprints.map((x) => ({ id: x.sprint_id, label: x.sprint_name }))}
        onClose={() => setEditTask(null)}
        onSubmit={async (data) => {
          if (!editTask) return;
          // The sprint is changed from the backlog; the task update endpoint does not take it
          const { sprint_id: _sprint, ...rest } = data as unknown as Record<string, unknown>;
          await customFetch(taskUrl(editTask.task_id), {
            method: 'PATCH',
            body: JSON.stringify(rest),
            headers: { 'Content-Type': 'application/json' },
          });
          await refreshPlanning();
          if (selectedDrawerTaskId) await reloadTaskDetail(selectedDrawerTaskId);
        }}
      />

      <CreateBugModal
        projectId={projectId}
        projectMembers={project?.members || []}
        tasks={tasks}
        isOpen={isBugModalOpen}
        onClose={() => setIsBugModalOpen(false)}
        onSubmit={handleCreateBug}
      />

      <BugDetailsModal
        projectId={projectId}
        bugId={selectedBugId}
        isOpen={selectedBugId !== null}
        onClose={() => setSelectedBugId(null)}
        onBugUpdated={loadProjectData}
        canEditDates={isManagerOrAdmin}
      />

      {/* Reason Modal for On-Hold or Cancelled Status */}
      {targetStatusChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="text-sm font-bold text-slate-900">
                Reason Required ({STATUS_CONFIGS[targetStatusChange]?.label})
              </h4>
            </div>
            <textarea
              rows={3}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Provide a mandatory reason..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTargetStatusChange(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!statusReason.trim() || isSubmittingStatus}
                onClick={() => executeStatusUpdate(targetStatusChange, statusReason.trim())}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal (Full project form with all fields & member management) */}
      <CreateProjectModal
        isOpen={isEditProjectModalOpen}
        mode="edit"
        initialData={project}
        employees={employees}
        onClose={() => setIsEditProjectModalOpen(false)}
        onSubmit={async (payload) => {
          if (!projectId) return;
          try {
            await updateProject(projectId, payload);
            await loadProjectData();
            onProjectUpdated?.();
            setIsEditProjectModalOpen(false);
          } catch (err: any) {
            console.error(err);
            alert(err?.detail || err?.message || 'Failed to update project');
          }
        }}
      />
    </div>
  );
};
