import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  CheckSquare,
  Plus,
  Layers,
  MessageSquare,
  History,
  Users,
  Edit3,
  AlertCircle,
  Bug,
  FileText,
  AlertTriangle,
  RotateCcw,
  Code2,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useSocket } from '@/shared/socket/SocketContext';
import {
  fetchProjectDetail,
  updateProject,
  updateProjectStatus,
  fetchProjectSprints,
  createSprint,
  fetchSprintTasks,
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
  ProjectActivityLogItem,
  ProjectBugItem,
  ProjectDiscussionItem,
  ProjectItem,
  ProjectStatus,
  ProjectTaskItem,
  SprintItem,
} from '../types';
import type { TaskStage } from '../../tasks/types';
import { TaskDrawer } from '../../tasks/components/TaskDrawer';
import { CreateSprintModal } from './CreateSprintModal';
import { CreateProjectTaskModal } from './CreateProjectTaskModal';
import { CreateBugModal } from './CreateBugModal';
import { BugDetailsModal } from './BugDetailsModal';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectClientTechTab } from './ProjectClientTechTab';
import { WhatsAppChat } from '@/shared/components/chat/WhatsAppChat';
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

const STAGE_CONFIG: Record<TaskStage, { label: string; badge: string }> = {
  assigned: { label: 'Assigned', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'In Progress', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  hold: { label: 'Hold', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  requested: { label: 'Submitted', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
  completed: { label: 'Approved', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const BUG_STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'border-slate-200 bg-slate-50 text-slate-700' },
  open: { label: 'Open', cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  ready_for_dev: { label: 'Ready for Dev', cls: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  dev_in_progress: { label: 'Dev in Progress', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  ready_for_qa: { label: 'Ready for QA', cls: 'border-violet-200 bg-violet-50 text-violet-700' },
  qa_in_progress: { label: 'QA in Progress', cls: 'border-orange-200 bg-orange-50 text-orange-700' },
  done: { label: 'Done', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  not_a_bug: { label: 'Not a Bug', cls: 'border-slate-200 bg-slate-100 text-slate-500' },
};

export interface ProjectDetailsDrawerProps {
  projectId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated?: () => void;
}

export const ProjectDetailsDrawer: React.FC<ProjectDetailsDrawerProps> = ({
  projectId,
  isOpen,
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
  const [activeTab, setActiveTab] = useState<'tasks' | 'discussion' | 'overview' | 'details' | 'activity'>('tasks');
  const [tasksSubTab, setTasksSubTab] = useState<'board' | 'bugs'>('board');

  // Filters
  const [selectedEmpFilter, setSelectedEmpFilter] = useState('all');
  const [selectedSprintFilter, setSelectedSprintFilter] = useState<string>('all');
  // Overview filters (BFD 2.6): Date period + Employee drive the KPI cards and Person-wise Summary.
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  // Dedicated Bug Tab Filters
  const [bugSearch, setBugSearch] = useState('');

  // Modals
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [selectedBugId, setSelectedBugId] = useState<number | null>(null);
  const [selectedDrawerTaskId, setSelectedDrawerTaskId] = useState<number | null>(null);
  const [drawerTaskDetail, setDrawerTaskDetail] = useState<TaskDetailDto | null>(null);

  // Status Change State
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [targetStatusChange, setTargetStatusChange] = useState<ProjectStatus | null>(null);
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
  }, [selectedDrawerTaskId, isAdmin]);

  // KPI Calculations
  // Tasks inside the selected period and employee (BFD 2.6 filters).
  const periodTasks = useMemo(() => {
    const inPeriod = (t: ProjectTaskItem) => {
      if (!periodFrom && !periodTo) return true;
      const dates = [t.created_at, t.started_at, t.requested_at, t.completed_at].filter(Boolean).map((d) => String(d).slice(0, 10));
      return dates.some((d) => (!periodFrom || d >= periodFrom) && (!periodTo || d <= periodTo));
    };
    return tasks.filter(
      (t) => inPeriod(t) && (selectedEmpFilter === 'all' || t.assignees?.some((a) => String(a.emp_id) === selectedEmpFilter)),
    );
  }, [tasks, periodFrom, periodTo, selectedEmpFilter]);

  const kpiData = useMemo(() => {
    const dmy = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('-') : '—'); // DD-MM-YYYY
    if (!project) return { estHours: 0, actHours: 0, startDate: '—', deadline: '—', actualEndDate: '—' };
    const estMinutes = periodTasks.reduce((acc, t) => acc + (t.allocated_minutes || 0), 0);
    const actMinutes = periodTasks.reduce((acc, t) => acc + (t.actual_minutes || 0), 0);
    return {
      estHours: Math.round((estMinutes / 60) * 10) / 10,
      actHours: Math.round((actMinutes / 60) * 10) / 10,
      startDate: dmy(project.start_date),
      deadline: dmy(project.deadline),
      actualEndDate: project.actual_end_date ? dmy(project.actual_end_date) : '—',
    };
  }, [project, periodTasks]);

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

  // Group Filtered Tasks by Sprint (Sprint Name -> Tasks under this sprint)
  const groupedTasksBySprint = useMemo(() => {
    const groups: Array<{
      sprint_id: number | null;
      sprint_name: string;
      status?: string;
      tasks: ProjectTaskItem[];
    }> = [];

    if (selectedSprintFilter !== 'all') {
      const targetSprint = sprints.find((s) => String(s.sprint_id) === selectedSprintFilter);
      groups.push({
        sprint_id: targetSprint ? targetSprint.sprint_id : Number(selectedSprintFilter),
        sprint_name: targetSprint ? targetSprint.sprint_name : `Sprint #${selectedSprintFilter}`,
        status: targetSprint?.status,
        tasks: filteredTasks,
      });
      return groups;
    }

    // 1. Group tasks matching active sprints
    for (const s of sprints) {
      const sTasks = filteredTasks.filter((t) => t.sprint_id === s.sprint_id);
      if (sTasks.length > 0) {
        groups.push({
          sprint_id: s.sprint_id,
          sprint_name: s.sprint_name,
          status: s.status,
          tasks: sTasks,
        });
      }
    }

    // 2. Backlog / Unassigned Sprint tasks
    const backlogTasks = filteredTasks.filter(
      (t) => !t.sprint_id || !sprints.some((s) => s.sprint_id === t.sprint_id)
    );
    if (backlogTasks.length > 0) {
      groups.push({
        sprint_id: null,
        sprint_name: 'Backlog / General Tasks',
        tasks: backlogTasks,
      });
    }

    // Fallback if tasks exist but no sprints
    if (groups.length === 0 && filteredTasks.length > 0) {
      groups.push({
        sprint_id: null,
        sprint_name: 'Tasks',
        tasks: filteredTasks,
      });
    }

    return groups;
  }, [filteredTasks, sprints, selectedSprintFilter]);

  // Bug Summary
  const bugStats = useMemo(() => {
    return {
      total: bugs.length,
      open: bugs.filter((b) => b.status === 'new' || b.status === 'open').length,
      dev: bugs.filter((b) => ['ready_for_dev', 'dev_in_progress'].includes(b.status)).length,
      qa: bugs.filter((b) => ['ready_for_qa', 'qa_in_progress'].includes(b.status)).length,
      done: bugs.filter((b) => b.status === 'done').length,
    };
  }, [bugs]);

  // Filtered Bugs
  const filteredBugs = useMemo(() => {
    return bugs.filter((b) => {
      if (bugSearch) {
        const query = bugSearch.toLowerCase();
        const matchTitle = b.title.toLowerCase().includes(query);
        const matchCode = b.bug_code.toLowerCase().includes(query);
        if (!matchTitle && !matchCode) return false;
      }
      return true;
    });
  }, [bugs, bugSearch]);

  // Person-wise Workload Analytics
  const personWiseSummary = useMemo(() => {
    if (!project?.members) return [];
    return project.members
      .filter((m) => selectedEmpFilter === 'all' || String(m.employee_id) === selectedEmpFilter)
      .map((member) => {
        const memberTasks = periodTasks.filter((t) =>
          t.assignees?.some((a) => a.emp_id === member.employee_id)
        );

        const totalTasks = memberTasks.length;
        const completedTasks = memberTasks.filter((t) => t.stage === 'completed').length;
        const estMinutes = memberTasks.reduce((sum, t) => sum + (t.allocated_minutes || 0), 0);
        const actMinutes = memberTasks.reduce((sum, t) => sum + (t.actual_minutes || 0), 0);

        return {
          emp_id: member.employee_id,
          name: member.name,
          email: member.email,
          role: member.role_in_project || 'Member',
          totalTasks,
          completedTasks,
          estHours: (estMinutes / 60).toFixed(1),
          actHours: (actMinutes / 60).toFixed(1),
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        };
      });
  }, [project, periodTasks, selectedEmpFilter]);

  // Status Update Handlers
  const promptStatusChange = (newStatus: ProjectStatus) => {
    setIsStatusDropdownOpen(false);
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

  const handleCreateBug = async (payload: CreateProjectBugPayload) => {
    if (!projectId) return;
    await createProjectBug(projectId, payload);
    const updated = await fetchProjectBugs(projectId);
    setBugs(updated);
    setTasksSubTab('bugs');
  };

  if (!isOpen || !projectId) return null;

  const statusStyle = project ? (STATUS_CONFIGS[project.project_status] || STATUS_CONFIGS.new) : STATUS_CONFIGS.new;

  // Final 4 Tabs: Tasks, Discussion, Overview, Activity Logs
  const tabsList = [
    { id: 'tasks', label: 'TASKS', icon: CheckSquare, badge: filteredTasks.length },
    { id: 'discussion', label: 'DISCUSSION', icon: MessageSquare, badge: discussions.length },
    { id: 'overview', label: 'OVERVIEW', icon: FileText },
    { id: 'details', label: 'CLIENT & TECH', icon: Code2 },
    { id: 'activity', label: 'ACTIVITY LOG', icon: History, badge: activityLogs.length },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over panel on the right (same as image) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 h-full overflow-hidden">
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
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-200/80 px-2.5 py-0.5 rounded-md border border-slate-300/80">
                      {project.project_no}
                    </span>

                    {/* Status Pill with Dropdown for PM/Admin */}
                    {isManagerOrAdmin ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition cursor-pointer ${statusStyle.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          <span>{statusStyle.label}</span>
                          <span className="text-[9px] text-slate-400 ml-0.5">▼</span>
                        </button>

                        {isStatusDropdownOpen && (
                          <div className="absolute left-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40">
                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Update Status
                            </div>
                            {(Object.keys(STATUS_CONFIGS) as ProjectStatus[]).map((st) => (
                              <button
                                key={st}
                                onClick={() => promptStatusChange(st)}
                                className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 flex items-center justify-between text-slate-700 cursor-pointer"
                              >
                                <span>{STATUS_CONFIGS[st].label}</span>
                                {project.project_status === st && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusStyle.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        <span>{statusStyle.label}</span>
                      </div>
                    )}
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

                <h2 className="text-xl font-black text-slate-900 tracking-tight mt-2">
                  {project.project_name}
                </h2>
              </div>

              {/* Tabs Navigation (NO PIPELINE TAB) */}
              <div className="px-6 border-b border-slate-100 bg-white shrink-0">
                <nav className="flex space-x-5 overflow-x-auto scrollbar-none" aria-label="Tabs">
                  {tabsList.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-1.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap cursor-pointer transition ${
                          isActive
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Drawer Body - Scrollable content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. TAB: TASKS (Image 2 & 3) */}
                {activeTab === 'tasks' && (
                  <div className="space-y-4">
                    {/* If a task is selected, show embedded Task Details view (Image 2) */}
                    {selectedDrawerTaskId !== null && drawerTaskDetail ? (
                      <div className="space-y-3">
                        <TaskDrawer
                          task={drawerTaskDetail}
                          isOpen={true}
                          isAdmin={isAdmin}
                          embedded={true}
                          onClose={() => setSelectedDrawerTaskId(null)}
                          onMoveStage={handleMoveStage}
                          onTrackWorkSession={async (taskId, action, note) => {
                            const url = isAdmin
                              ? `/api/v1/admin/tasks/${taskId}/work-session`
                              : `/api/v1/my-tasks/${taskId}/work-session`;
                            await customFetch(url, {
                              method: 'POST',
                              body: JSON.stringify({ action, note }),
                              headers: { 'Content-Type': 'application/json' },
                            });
                            const freshTasks = await fetchSprintTasks(projectId);
                            setTasks(freshTasks);
                            const res = await customFetch<any>(url.replace('/work-session', ''));
                            setDrawerTaskDetail(res?.data || res);
                          }}
                          onAddSubTask={() => setIsTaskModalOpen(true)}
                          onSendMessage={async (_taskId, message) => {
                            try {
                              await createProjectDiscussion(
                                projectId,
                                `[${drawerTaskDetail.task_code}] ${message}`
                              );
                              const freshDiscussions = await fetchProjectDiscussions(projectId);
                              setDiscussions(freshDiscussions);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      /* Otherwise, show INDIVIDUAL LOGS list view (Image 3) */
                      <div className="space-y-4">
                        {/* Sub-view switcher & Quick Actions Bar */}
                        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => setTasksSubTab('board')}
                              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                tasksSubTab === 'board'
                                  ? 'bg-white text-blue-600 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>Tasks</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                tasksSubTab === 'board' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {tasks.length}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setTasksSubTab('bugs')}
                              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                tasksSubTab === 'bugs'
                                  ? 'bg-white text-rose-600 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Bug className="w-3.5 h-3.5" />
                              <span>Bugs</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                tasksSubTab === 'bugs' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {bugs.length}
                              </span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsBugModalOpen(true)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                            >
                              <Bug className="w-3.5 h-3.5" />
                              <span>Create Bug</span>
                            </button>
                            {isManagerOrAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setIsSprintModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                                  title="Create a new sprint"
                                >
                                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Create Sprint</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsTaskModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Create Task</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* SUB-VIEW 1: Tasks List (Image 3) */}
                        {tasksSubTab === 'board' && (
                          <div className="space-y-4">
                            {/* Header: INDIVIDUAL LOGS & Action Bar */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                  INDIVIDUAL LOGS
                                </h3>
                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                  {filteredTasks.length}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2.5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <span className="font-semibold text-slate-400">Sprint:</span>
                                  <select
                                    value={selectedSprintFilter}
                                    onChange={(e) => setSelectedSprintFilter(e.target.value)}
                                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  >
                                    <option value="all">All Sprints</option>
                                    {sprints.map((s) => (
                                      <option key={s.sprint_id} value={s.sprint_id}>
                                        {s.sprint_name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {isManagerOrAdmin && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <span className="font-semibold text-slate-400">Assignee:</span>
                                    <select
                                      value={selectedEmpFilter}
                                      onChange={(e) => setSelectedEmpFilter(e.target.value)}
                                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                      <option value="all">All Assignees</option>
                                      {project.members?.map((m) => (
                                        <option key={m.employee_id} value={m.employee_id}>
                                          {m.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {(selectedSprintFilter !== 'all' || selectedEmpFilter !== 'all') && (
                                  <button
                                    onClick={() => {
                                      setSelectedSprintFilter('all');
                                      setSelectedEmpFilter('all');
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                                    title="Reset Filters"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Task List Grouped by Sprint (Sprint Name -> Tasks under this sprint) */}
                            <div className="space-y-6">
                              {filteredTasks.length === 0 ? (
                                <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                                  <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                  <h4 className="text-sm font-bold text-slate-800 mb-1">No Tasks Found</h4>
                                  <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
                                    Create tasks to track individual assignments, stages, and work sessions.
                                  </p>
                                  {isManagerOrAdmin && (
                                    <button
                                      onClick={() => setIsTaskModalOpen(true)}
                                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
                                    >
                                      + Create Stage Task
                                    </button>
                                  )}
                                </div>
                              ) : (
                                groupedTasksBySprint.map((grp) => (
                                  <div key={grp.sprint_id ?? 'backlog'} className="space-y-2.5">
                                    {/* Sprint Group Header */}
                                    <div className="flex items-center justify-between px-1.5 py-1">
                                      <div className="flex items-center gap-2">
                                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                          {grp.sprint_name}
                                        </h4>
                                        {grp.status && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80">
                                            {grp.status}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                        {grp.tasks.filter((t) => t.stage === 'completed').length} / {grp.tasks.length} completed
                                      </span>
                                    </div>

                                    {/* Tasks under this sprint */}
                                    <div className="space-y-2.5">
                                      {grp.tasks.map((t) => {
                                        const stConf = (t.stage && STAGE_CONFIG[t.stage as TaskStage])
                                          ? STAGE_CONFIG[t.stage as TaskStage]
                                          : { label: t.stage || 'Assigned', badge: 'bg-slate-100 text-slate-700 border-slate-200' };
                                        const assigneesText = t.assignees?.map((a) => a.name).join(', ') || 'Unassigned';
                                        return (
                                          <div
                                            key={t.task_id}
                                            onClick={() => setSelectedDrawerTaskId(t.task_id)}
                                            className="bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-blue-400 rounded-2xl p-4 transition-all duration-150 cursor-pointer flex items-center justify-between shadow-2xs hover:shadow-xs group"
                                          >
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                                  {t.task_code}
                                                </span>
                                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                                                  {t.title}
                                                </h4>
                                              </div>
                                              <p className="text-xs text-slate-500 mt-1">
                                                Assigned to: <span className="font-medium text-slate-700">{assigneesText}</span>
                                              </p>
                                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold">
                                                {t.priority && (
                                                  <span className={`rounded-md px-1.5 py-0.5 capitalize ${t.priority === 'high' ? 'bg-rose-50 text-rose-700' : t.priority === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {t.priority}
                                                  </span>
                                                )}
                                                {t.task_type && <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-violet-700">{t.task_type}</span>}
                                                {t.allocated_minutes ? (
                                                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">
                                                    {Math.floor(t.allocated_minutes / 60)}h {t.allocated_minutes % 60}m
                                                  </span>
                                                ) : null}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${stConf.badge}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                {stConf.label}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* SUB-VIEW 2: Bugs */}
                        {tasksSubTab === 'bugs' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              <div className="bg-white p-3 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                                <div className="text-base font-black text-slate-900">{bugStats.total}</div>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-rose-600 uppercase">Open</span>
                                <div className="text-base font-black text-rose-600">{bugStats.open}</div>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-amber-600 uppercase">In Dev</span>
                                <div className="text-base font-black text-amber-600">{bugStats.dev}</div>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase">In QA</span>
                                <div className="text-base font-black text-indigo-600">{bugStats.qa}</div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <input
                                type="text"
                                value={bugSearch}
                                onChange={(e) => setBugSearch(e.target.value)}
                                placeholder="Search bugs by code or title..."
                                className="w-full sm:w-64 px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            <div className="space-y-2">
                              {filteredBugs.length === 0 ? (
                                <div className="py-10 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                                  No bugs reported
                                </div>
                              ) : (
                                filteredBugs.map((b) => (
                                  <div
                                    key={b.bug_id}
                                    onClick={() => setSelectedBugId(b.bug_id)}
                                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer"
                                  >
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                          {b.bug_code}
                                        </span>
                                        <span className="text-xs font-bold text-slate-900">{b.title}</span>
                                      </div>
                                      <p className="mt-1 text-[11px] text-slate-500">
                                        Assigned to <span className="font-medium text-slate-700">{b.assigned_to_name || '—'}</span>
                                        <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${b.priority === 'high' ? 'bg-rose-50 text-rose-700' : b.priority === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                          {b.priority}
                                        </span>
                                      </p>
                                    </div>
                                    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${BUG_STATUS[b.status]?.cls || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                      {BUG_STATUS[b.status]?.label || b.status}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. TAB: DISCUSSION (WhatsApp Chat Format with Emojis & Tag Notifications) */}
                {activeTab === 'discussion' && (
                  <WhatsAppChat
                    title={project.project_name}
                    subtitle="Real-time Team Discussion & Mentions"
                    messages={discussions}
                    currentUserId={user?.emp_id}
                    members={project.members || []}
                    onSendMessage={async (message, taggedIds) => {
                      await createProjectDiscussion(projectId, message, undefined, taggedIds);
                      const updated = await fetchProjectDiscussions(projectId);
                      setDiscussions(updated);
                    }}
                    heightClass="h-[540px]"
                  />
                )}

                {/* 3. TAB: OVERVIEW (merged Project Info + Workload Summary + Team) */}
                {activeTab === 'overview' && (
                  <div className="space-y-5">
                    {/* Filters + KPI cards (BFD 2.6). Not shown to employees (BFD 3.3). */}
                    {isManagerOrAdmin && (
                      <>
                        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                          <div>
                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">From</span>
                            <input type="date" value={periodFrom} max={periodTo || undefined} onChange={(e) => setPeriodFrom(e.target.value)} className="h-9 rounded-xl border border-slate-200 px-2.5 text-xs text-slate-700" />
                          </div>
                          <div>
                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">To</span>
                            <input type="date" value={periodTo} min={periodFrom || undefined} onChange={(e) => setPeriodTo(e.target.value)} className="h-9 rounded-xl border border-slate-200 px-2.5 text-xs text-slate-700" />
                          </div>
                          <div>
                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee</span>
                            <select value={selectedEmpFilter} onChange={(e) => setSelectedEmpFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 px-2.5 text-xs text-slate-700">
                              <option value="all">All employees</option>
                              {project.members?.map((m) => (
                                <option key={m.employee_id} value={m.employee_id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {(periodFrom || periodTo || selectedEmpFilter !== 'all') && (
                            <button
                              type="button"
                              onClick={() => {
                                setPeriodFrom('');
                                setPeriodTo('');
                                setSelectedEmpFilter('all');
                              }}
                              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Reset
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                          {[
                            { label: 'Total Estimated Work Hours', value: `${kpiData.estHours} hrs`, tone: 'text-slate-900', bar: 'from-blue-500 to-indigo-500' },
                            { label: 'Actual Work Hours', value: `${kpiData.actHours} hrs`, tone: 'text-emerald-600', bar: 'from-emerald-400 to-teal-500' },
                            { label: 'Start Date', value: kpiData.startDate, tone: 'text-slate-800', bar: 'from-slate-300 to-slate-400' },
                            { label: 'Estimated End Date', value: kpiData.deadline, tone: 'text-amber-600', bar: 'from-amber-400 to-orange-500' },
                            { label: 'Actual End Date', value: kpiData.actualEndDate, tone: 'text-violet-600', bar: 'from-violet-400 to-fuchsia-500' },
                          ].map((k) => (
                            <div key={k.label} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                              <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${k.bar}`} aria-hidden />
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{k.label}</span>
                              <span className={`mt-1 block text-sm font-black ${k.tone}`}>{k.value}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Project Information Card */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Project Details</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Core project configuration and metadata</p>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setIsEditProjectModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Project</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Project Code</span>
                          <span className="font-mono font-bold text-slate-800">{project.project_no}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusStyle.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            {statusStyle.label}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Project Type</span>
                          <span className="font-semibold text-slate-800 capitalize">{project.project_type.replace(/_/g, ' ')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                          <span className="font-semibold text-slate-800 capitalize">{project.category.replace(/_/g, ' ')}</span>
                        </div>
                        {isManagerOrAdmin && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Client</span>
                            <span className="font-semibold text-slate-800">{project.client_name || '—'}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Project Manager</span>
                          <span className="font-semibold text-slate-800">{project.project_manager_name || 'Unassigned'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Project Description</span>
                        <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 max-h-60 overflow-y-auto">
                          {project.description || <span className="text-slate-400 italic">No description provided.</span>}
                        </div>
                      </div>
                    </div>

                    {/* Person-wise Summary (BFD 2.6) — Admin and Project Manager only */}
                    {isManagerOrAdmin && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Workload Summary</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Task distribution, completion rates, and logged hours per member</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          Total Hours Worked: {personWiseSummary.reduce((sum, p) => sum + Number(p.actHours), 0).toFixed(1)}h
                        </span>
                      </div>

                      {personWiseSummary.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No team members assigned to calculate workload.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold">
                                <th className="py-2.5">Member</th>
                                <th className="py-2.5 text-center">Tasks</th>
                                <th className="py-2.5 text-center">Completed</th>
                                <th className="py-2.5 text-center">Estimated Hours</th>
                                <th className="py-2.5 text-center">Hours Worked</th>
                                <th className="py-2.5 text-right">Progress</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {personWiseSummary.map((item) => (
                                <tr key={item.emp_id} className="hover:bg-slate-50/60 transition">
                                  <td className="py-2.5 font-semibold text-slate-800">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                                        {item.name.substring(0, 2).toUpperCase()}
                                      </div>
                                      <div>
                                        <div>{item.name}</div>
                                        <div className="text-[10px] text-slate-400 font-normal">{item.role}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2.5 text-center font-bold text-slate-700">{item.totalTasks}</td>
                                  <td className="py-2.5 text-center font-bold text-emerald-600">{item.completedTasks}</td>
                                  <td className="py-2.5 text-center font-mono font-medium text-slate-700">{item.estHours}h</td>
                                  <td className="py-2.5 text-center font-mono font-medium text-slate-700">{item.actHours}h</td>
                                  <td className="py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div
                                          className="bg-emerald-500 h-full rounded-full"
                                          style={{ width: `${item.completionRate}%` }}
                                        />
                                      </div>
                                      <span className="font-mono text-[11px] font-semibold text-slate-600 w-8 text-right">
                                        {item.completionRate}%
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    )}

                    {/* Team Members List */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Assigned Team</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Project manager and contributors</p>
                        </div>
                        {isManagerOrAdmin && (
                          <button
                            type="button"
                            onClick={() => setIsEditProjectModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Manage Team</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {project.members?.map((m) => {
                          const isPm = m.employee_id === project.project_manager_id;
                          return (
                            <div
                              key={m.employee_id}
                              className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                                  isPm ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {m.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                                    <span>{m.name}</span>
                                    {isPm && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                                        PM
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">{m.email}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: CLIENT & TECH (BFD 2.3 Additional Details, 2.4 Tech Stack, 2.5 Deployment) */}
                {activeTab === 'details' && (
                  <ProjectClientTechTab
                    project={project}
                    canManage={isManagerOrAdmin}
                    onSaved={(updated) => {
                      setProject((prev) => (prev ? { ...prev, ...updated } : updated));
                      onProjectUpdated?.();
                    }}
                  />
                )}

                {/* 4. TAB: ACTIVITY LOG */}
                {activeTab === 'activity' && (
                  <div className="space-y-3">
                    {activityLogs.length === 0 ? (
                      <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                        No activity recorded yet
                      </div>
                    ) : (
                      activityLogs.map((log) => (
                        <div key={log.log_id} className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-start gap-3 shadow-2xs">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                            <History className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{log.actor_name}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(log.created_at).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                            <p className="text-slate-600 mt-0.5">{log.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
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
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateTask}
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
