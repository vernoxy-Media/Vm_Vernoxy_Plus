import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Calendar,
  Flag,
  CheckSquare,
  Plus,
  Layers,
  MessageSquare,
  History,
  Users,
  Server,
  Code,
  ExternalLink,
  Copy,
  Edit3,
  Save,
  X,
  AlertCircle,
  Bug,
  Send,
  User,
  UserPlus,
  UserMinus,
  UserCheck,
  KeyRound,
  FileText,
  AlertTriangle,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../core/socket/SocketContext';
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
  CreateProjectPayload,
  CreateProjectTaskPayload,
  CreateSprintPayload,
  ProjectActivityLogItem,
  ProjectBugItem,
  ProjectDiscussionItem,
  ProjectItem,
  ProjectMember,
  ProjectStatus,
  ProjectTaskItem,
  SprintItem,
} from '../types';
import type { TaskStage } from '../../tasks/types';
import { TaskBoard } from '../../tasks/components/TaskBoard';
import { TaskDrawer } from '../../tasks/components/TaskDrawer';
import { CreateSprintModal } from '../components/CreateSprintModal';
import { CreateProjectTaskModal } from '../components/CreateProjectTaskModal';
import { CreateBugModal } from '../components/CreateBugModal';
import { BugDetailsModal } from '../components/BugDetailsModal';
import type { TaskBoardResultDto, TaskDetailDto } from '@vernoxy-pulse/api-client';

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

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const projectId = Number(id);

  const isAdmin = Boolean(
    user?.access?.can_manage_organization ||
    user?.role?.role_name?.toLowerCase().includes('admin')
  );

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

  // Tabs
  const [activeTab, setActiveTab] = useState<number>(0);

  // Filters & Period
  const [periodStartDate, setPeriodStartDate] = useState('');
  const [periodEndDate, setPeriodEndDate] = useState('');
  const [selectedEmpFilter, setSelectedEmpFilter] = useState('all');
  const [selectedSprintFilter, setSelectedSprintFilter] = useState<string>('all');

  // Dedicated Bug Tab Filters
  const [bugSearch, setBugSearch] = useState('');
  const [bugStatusFilter, setBugStatusFilter] = useState('all');
  const [bugPriorityFilter, setBugPriorityFilter] = useState('all');

  // Modals
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [selectedBugId, setSelectedBugId] = useState<number | null>(null);
  const [selectedDrawerTaskId, setSelectedDrawerTaskId] = useState<number | null>(null);
  const [drawerTaskDetail, setDrawerTaskDetail] = useState<TaskDetailDto | null>(null);

  // Status Change State
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [targetStatusChange, setTargetStatusChange] = useState<ProjectStatus | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Details Tab 0 Sub-Tab State (Project Overview, Tech Stack, Deployment Details)
  const [detailsSubTab, setDetailsSubTab] = useState<'overview' | 'tech' | 'deployment'>('overview');

  // Change PM & Member Management Modals
  const [isChangePmModalOpen, setIsChangePmModalOpen] = useState(false);
  const [selectedNewPmId, setSelectedNewPmId] = useState<string>('');
  const [isSubmittingPmChange, setIsSubmittingPmChange] = useState(false);

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedNewMemberId, setSelectedNewMemberId] = useState<string>('');
  const [isSubmittingAddMember, setIsSubmittingAddMember] = useState(false);

  const [isRemovingMemberId, setIsRemovingMemberId] = useState<number | null>(null);

  // Details Tab Inline Edit State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsSaveSuccess, setDetailsSaveSuccess] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editLeadReceivedDate, setEditLeadReceivedDate] = useState('');
  const [editProjectApprovedDate, setEditProjectApprovedDate] = useState('');
  const [editTechFrontend, setEditTechFrontend] = useState('');
  const [editTechBackend, setEditTechBackend] = useState('');
  const [editTechCloud, setEditTechCloud] = useState('');
  const [editVercelAccount, setEditVercelAccount] = useState('');
  const [editVercelLink, setEditVercelLink] = useState('');
  const [editDomainLink, setEditDomainLink] = useState('');
  const [editStorageAccount, setEditStorageAccount] = useState('');
  const [editDeploymentDate, setEditDeploymentDate] = useState('');
  const [editGoLiveDate, setEditGoLiveDate] = useState('');
  const [editDeploymentDoneBy, setEditDeploymentDoneBy] = useState<string | number>('');
  const [editAdminLoginLink, setEditAdminLoginLink] = useState('');
  const [editCredentials, setEditCredentials] = useState<
    Array<{ admin_label: string; admin_id: string; admin_password: string; showPassword?: boolean }>
  >([]);

  // Discussion Input State
  const [newMessageText, setNewMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Load all project data
  const loadProjectData = useCallback(async () => {
    if (!projectId || isNaN(projectId)) {
      setError('Invalid Project ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [projData, sprintsData, tasksData, bugsData, discussionsData, logsData, assignable] =
        await Promise.all([
          fetchProjectDetail(projectId),
          fetchProjectSprints(projectId),
          fetchSprintTasks(projectId),
          fetchProjectBugs(projectId),
          fetchProjectDiscussions(projectId),
          fetchProjectActivityLogs(projectId),
          fetchAssignableEmployees(),
        ]);

      setProject(projData);
      setSprints(sprintsData);
      setTasks(tasksData);
      setBugs(bugsData);
      setDiscussions(discussionsData);
      setActivityLogs(logsData);
      setEmployees(assignable);

      // Populate details edit state
      setEditClientName(projData.client_name || '');
      setEditLeadReceivedDate(projData.lead_received_date ? projData.lead_received_date.split('T')[0] : '');
      setEditProjectApprovedDate(projData.project_approved_date ? projData.project_approved_date.split('T')[0] : '');
      setEditTechFrontend(projData.tech_frontend || '');
      setEditTechBackend(projData.tech_backend || '');
      setEditTechCloud(projData.tech_cloud || '');
      setEditVercelAccount(projData.deployment?.vercel_account || '');
      setEditVercelLink(projData.deployment?.vercel_link || '');
      setEditDomainLink(projData.deployment?.domain_link || '');
      setEditStorageAccount(projData.deployment?.storage_account || '');
      setEditDeploymentDate(projData.deployment?.deployment_date ? projData.deployment.deployment_date.split('T')[0] : '');
      setEditGoLiveDate(projData.deployment?.go_live_date ? projData.deployment.go_live_date.split('T')[0] : '');
      setEditDeploymentDoneBy(projData.deployment?.deployment_done_by || '');
      setEditAdminLoginLink(projData.deployment?.admin_login_link || '');
      setEditCredentials(
        projData.credentials && projData.credentials.length > 0
          ? projData.credentials.map((c) => ({
              admin_label: c.admin_label,
              admin_id: c.admin_id,
              admin_password: c.admin_password_encrypted || '',
              showPassword: false,
            }))
          : []
      );
    } catch (err: any) {
      console.error('Failed to load project details:', err);
      setError(err?.detail || err?.message || 'Could not load project details.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Real-Time WebSocket listeners for project discussions, tasks, bugs, and sprints
  useEffect(() => {
    if (!projectId || isNaN(projectId)) return;

    joinProject(projectId);

    if (!socket) return;

    const handleNewDiscussion = (msg: ProjectDiscussionItem) => {
      setDiscussions((prev) => {
        if (prev.some((d) => d.message_id === msg.message_id)) return prev;
        return [...prev, msg];
      });
    };

    const handleTaskChange = () => {
      fetchSprintTasks(projectId).then(setTasks).catch(() => {});
    };

    const handleBugChange = () => {
      fetchProjectBugs(projectId).then(setBugs).catch(() => {});
    };

    const handleSprintChange = () => {
      fetchProjectSprints(projectId).then(setSprints).catch(() => {});
    };

    socket.on('discussion:new_message', handleNewDiscussion);
    socket.on('task:created', handleTaskChange);
    socket.on('task:stage_changed', handleTaskChange);
    socket.on('task:updated', handleTaskChange);
    socket.on('bug:created', handleBugChange);
    socket.on('bug:status_changed', handleBugChange);
    socket.on('bug:comment_added', handleBugChange);
    socket.on('sprint:created', handleSprintChange);
    socket.on('sprint:updated', handleSprintChange);

    return () => {
      leaveProject(projectId);
      socket.off('discussion:new_message', handleNewDiscussion);
      socket.off('task:created', handleTaskChange);
      socket.off('task:stage_changed', handleTaskChange);
      socket.off('task:updated', handleTaskChange);
      socket.off('bug:created', handleBugChange);
      socket.off('bug:status_changed', handleBugChange);
      socket.off('bug:comment_added', handleBugChange);
      socket.off('sprint:created', handleSprintChange);
      socket.off('sprint:updated', handleSprintChange);
    };
  }, [socket, projectId, joinProject, leaveProject]);

  // Load Task Drawer Details
  useEffect(() => {
    if (!selectedDrawerTaskId) {
      setDrawerTaskDetail(null);
      return;
    }
    const loadTask = async () => {
      try {
        const url = isAdmin ? `/api/v1/admin/tasks/${selectedDrawerTaskId}` : `/api/v1/my-tasks/${selectedDrawerTaskId}`;
        const res = await customFetch<any>(url);
        setDrawerTaskDetail(res?.data || res);
      } catch (err) {
        console.error('Failed to load task drawer details:', err);
      }
    };
    loadTask();
  }, [selectedDrawerTaskId, isAdmin]);

  // 5 KPI Cards Computations (BFD Section 2.6)
  const kpiData = useMemo(() => {
    const totalEstMinutes =
      project?.total_estimated_minutes ??
      tasks.reduce((sum, t) => sum + (t.allocated_minutes || 0), 0);
    const actualWorkMinutes =
      project?.actual_work_minutes ??
      tasks.reduce((sum, t) => sum + ((t as any).actual_minutes || 0), 0);

    const estHours = Math.round((totalEstMinutes / 60) * 10) / 10;
    const actHours = Math.round((actualWorkMinutes / 60) * 10) / 10;

    const startDateFormatted = project?.start_date
      ? new Date(project.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

    const deadlineFormatted = project?.deadline
      ? new Date(project.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

    const actualEndFormatted =
      project?.project_status === 'delivered'
        ? project.actual_end_date
          ? new Date(project.actual_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : new Date(project.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    return {
      estHours,
      actHours,
      startDate: startDateFormatted,
      estimatedEndDate: deadlineFormatted,
      actualEndDate: actualEndFormatted,
    };
  }, [project, tasks]);

  // Person-wise summary table calculations (BFD Section 2.6)
  const personWiseSummary = useMemo(() => {
    if (!project) return [];

    // Collect all unique members (PM + assigned team)
    const membersMap = new Map<number, ProjectMember>();
    if (project.project_manager_id) {
      membersMap.set(project.project_manager_id, {
        member_id: 0,
        project_id: project.project_id,
        employee_id: project.project_manager_id,
        name: project.project_manager_name,
        email: project.project_manager_email,
        role_in_project: 'Project Manager',
      });
    }
    project.members?.forEach((m) => {
      membersMap.set(m.employee_id, m);
    });

    const list = Array.from(membersMap.values());

    return list.map((m) => {
      // Find tasks assigned to this member
      const memberTasks = tasks.filter((t) => {
        const isAssigned = t.assignees?.some((a) => a.emp_id === m.employee_id);
        if (!isAssigned) return false;

        // Apply period filter if set
        if (periodStartDate && t.created_at < periodStartDate) return false;
        if (periodEndDate && t.created_at > periodEndDate) return false;
        return true;
      });

      const totalTasksCount = memberTasks.length;
      const completedTasksCount = memberTasks.filter(
        (t) => t.stage === 'completed' || t.status === 'completed'
      ).length;
      const estimatedMinutes = memberTasks.reduce((sum, t) => sum + (t.allocated_minutes || 0), 0);
      const actualMinutes = memberTasks.reduce((sum, t) => sum + ((t as any).actual_minutes || 0), 0);

      return {
        emp_id: m.employee_id,
        name: m.name,
        role: m.role_in_project || 'Member',
        profile_picture: m.profile_picture,
        totalTasks: totalTasksCount,
        completedTasks: completedTasksCount,
        estimatedHours: Math.round((estimatedMinutes / 60) * 10) / 10,
        hoursWorked: Math.round((actualMinutes / 60) * 10) / 10,
        progress: totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0,
      };
    });
  }, [project, tasks, periodStartDate, periodEndDate]);

  // Filtered Tasks for Tasks Tab (Section 3.3: employee sees only their own tasks)
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Employees only see their own tasks
      if (!isManagerOrAdmin && user?.emp_id) {
        const isAssignedToMe = t.assignees?.some((a) => a.emp_id === user.emp_id);
        if (!isAssignedToMe) return false;
      }

      if (selectedSprintFilter !== 'all') {
        const sId = Number(selectedSprintFilter);
        if (t.sprint_id !== sId) return false;
      }
      if (selectedEmpFilter !== 'all') {
        const eId = Number(selectedEmpFilter);
        const assigned = t.assignees?.some((a) => a.emp_id === eId);
        if (!assigned) return false;
      }
      if (periodStartDate && t.created_at < periodStartDate) return false;
      if (periodEndDate && t.created_at > periodEndDate) return false;
      return true;
    });
  }, [tasks, selectedSprintFilter, selectedEmpFilter, periodStartDate, periodEndDate, isManagerOrAdmin, user?.emp_id]);

  // Filtered Bugs for Dedicated Bugs Tab
  const filteredBugs = useMemo(() => {
    return bugs.filter((b) => {
      if (bugStatusFilter !== 'all' && b.status !== bugStatusFilter) return false;
      if (bugPriorityFilter !== 'all' && b.priority !== bugPriorityFilter) return false;
      if (bugSearch.trim()) {
        const q = bugSearch.toLowerCase().trim();
        return (
          b.title.toLowerCase().includes(q) ||
          b.bug_code.toLowerCase().includes(q) ||
          (b.assigned_to_name && b.assigned_to_name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [bugs, bugStatusFilter, bugPriorityFilter, bugSearch]);

  const bugStats = useMemo(() => {
    return {
      total: bugs.length,
      open: bugs.filter((b) => ['new', 'open'].includes(b.status)).length,
      dev: bugs.filter((b) => ['ready_for_dev', 'dev_in_progress'].includes(b.status)).length,
      qa: bugs.filter((b) => ['ready_for_qa', 'qa_in_progress'].includes(b.status)).length,
      done: bugs.filter((b) => b.status === 'done').length,
    };
  }, [bugs]);

  // Task Board DTO for Kanban
  const taskBoardDto: TaskBoardResultDto = useMemo(() => {
    const columns: {
      assigned: any[];
      in_progress: any[];
      hold: any[];
      requested: any[];
      completed: any[];
    } = {
      assigned: [],
      in_progress: [],
      hold: [],
      requested: [],
      completed: [],
    };

    filteredTasks.forEach((t) => {
      const stage = (t.stage || 'assigned') as TaskStage;
      if (columns[stage]) {
        columns[stage].push({
          task_id: t.task_id,
          task_code: t.task_code || `TSK-${t.task_id}`,
          title: t.title,
          stage,
          priority: t.priority || 'medium',
          due_date: t.due_date,
          allocated_minutes: t.allocated_minutes,
          actual_minutes: (t as any).actual_minutes || 0,
          progress_percentage: t.progress_percentage || 0,
          assignees: t.assignees || [],
        });
      }
    });

    return {
      columns,
      counts: {
        total: filteredTasks.length,
        assigned: columns.assigned.length,
        in_progress: columns.in_progress.length,
        hold: columns.hold.length,
        requested: columns.requested.length,
        completed: columns.completed.length,
      } as any,
    };
  }, [filteredTasks]);

  // Handle Drag-and-Drop Move Stage
  const handleMoveStage = async (
    taskId: number,
    targetStage: TaskStage,
    note?: string,
    holdReason?: string
  ) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.task_id === taskId ? { ...t, stage: targetStage } : t))
    );

    try {
      const url = isAdmin ? `/api/v1/admin/tasks/${taskId}/move` : `/api/v1/my-tasks/${taskId}/move`;
      await customFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          target_stage: targetStage,
          note,
          hold_reason: holdReason,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      // Reload tasks & activity logs in background
      const [updatedTasks, updatedLogs] = await Promise.all([
        fetchSprintTasks(projectId),
        fetchProjectActivityLogs(projectId),
      ]);
      setTasks(updatedTasks);
      setActivityLogs(updatedLogs);
    } catch (err: any) {
      console.error('Failed to move task stage:', err);
      alert(err?.detail || err?.message || 'Failed to move task stage');
      // Revert on error
      const freshTasks = await fetchSprintTasks(projectId);
      setTasks(freshTasks);
    }
  };

  // Status Change Confirmation / Reason
  const promptStatusChange = (status: ProjectStatus) => {
    setIsStatusDropdownOpen(false);
    if (status === 'on_hold' || status === 'cancelled') {
      setTargetStatusChange(status);
      setStatusReason('');
    } else {
      executeStatusUpdate(status);
    }
  };

  const executeStatusUpdate = async (status: ProjectStatus, reason?: string) => {
    if (!project) return;
    try {
      setIsSubmittingStatus(true);
      const updated = await updateProjectStatus(project.project_id, status, reason);
      setProject(updated);
      setTargetStatusChange(null);
      setStatusReason('');
      // Refresh logs
      const updatedLogs = await fetchProjectActivityLogs(projectId);
      setActivityLogs(updatedLogs);
    } catch (err: any) {
      console.error('Failed to update project status:', err);
      alert(err?.detail || err?.message || 'Failed to update project status');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Create Sprint Submission
  const handleCreateSprint = async (payload: CreateSprintPayload) => {
    await createSprint(projectId, payload);
    const updatedSprints = await fetchProjectSprints(projectId);
    setSprints(updatedSprints);
    setIsSprintModalOpen(false);
  };

  // Create Task Submission
  const handleCreateTask = async (payload: CreateProjectTaskPayload) => {
    await createProjectTask(projectId, payload);
    const updatedTasks = await fetchSprintTasks(projectId);
    setTasks(updatedTasks);
    setIsTaskModalOpen(false);
  };

  // Create Bug Submission
  const handleCreateBug = async (payload: CreateProjectBugPayload) => {
    await createProjectBug(projectId, payload);
    const updatedBugs = await fetchProjectBugs(projectId);
    setBugs(updatedBugs);
    setIsBugModalOpen(false);
  };

  // Send Discussion Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || isSendingMessage) return;

    try {
      setIsSendingMessage(true);
      const newMsg = await createProjectDiscussion(projectId, newMessageText.trim());
      setDiscussions((prev) => [...prev, newMsg]);
      setNewMessageText('');
    } catch (err: any) {
      console.error('Failed to post discussion message:', err);
      alert(err?.detail || err?.message || 'Failed to post message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Save Tab 0 Details (Tech Stack, Client info, Deployment details)
  const handleSaveDetails = async () => {
    if (!project) return;
    try {
      setIsSavingDetails(true);
      const payload: Partial<CreateProjectPayload> = {
        client_name: editClientName.trim() || undefined,
        lead_received_date: editLeadReceivedDate || undefined,
        project_approved_date: editProjectApprovedDate || undefined,
        tech_frontend: editTechFrontend.trim() || undefined,
        tech_backend: editTechBackend.trim() || undefined,
        tech_cloud: editTechCloud.trim() || undefined,
        deployment: {
          vercel_account: editVercelAccount.trim() || undefined,
          vercel_link: editVercelLink.trim() || undefined,
          domain_link: editDomainLink.trim() || undefined,
          storage_account: editStorageAccount.trim() || undefined,
          deployment_date: editDeploymentDate || undefined,
          go_live_date: editGoLiveDate || undefined,
          deployment_done_by: editDeploymentDoneBy ? Number(editDeploymentDoneBy) : undefined,
          admin_login_link: editAdminLoginLink.trim() || undefined,
        },
        credentials: editCredentials
          .filter((c) => c.admin_id.trim() && c.admin_password.trim())
          .map((c) => ({
            admin_label: c.admin_label.trim() || 'Admin',
            admin_id: c.admin_id.trim(),
            admin_password: c.admin_password.trim(),
          })),
      };

      const updated = await updateProject(project.project_id, payload);
      setProject(updated);
      setIsEditingDetails(false);
      setDetailsSaveSuccess('Project details updated successfully!');
      setTimeout(() => setDetailsSaveSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to update details:', err);
      alert(err?.detail || err?.message || 'Failed to save project details');
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Change Project Manager Handler
  const handleChangePm = async () => {
    if (!project || !selectedNewPmId) return;
    try {
      setIsSubmittingPmChange(true);
      const newPmId = Number(selectedNewPmId);
      const currentMemberIds = project.members?.map((m) => m.employee_id) || [];
      const updatedMemberIds = Array.from(new Set([...currentMemberIds, newPmId]));
      await updateProject(project.project_id, {
        project_manager_id: newPmId,
        member_ids: updatedMemberIds,
      });
      setIsChangePmModalOpen(false);
      setSelectedNewPmId('');
      await loadProjectData();
    } catch (err: any) {
      console.error('Failed to change PM:', err);
      alert(err?.detail || err?.message || 'Failed to change Project Manager');
    } finally {
      setIsSubmittingPmChange(false);
    }
  };

  // Add Member to Project Handler
  const handleAddMember = async () => {
    if (!project || !selectedNewMemberId) return;
    try {
      setIsSubmittingAddMember(true);
      const newEmpId = Number(selectedNewMemberId);
      const currentMemberIds = project.members?.map((m) => m.employee_id) || [];
      if (currentMemberIds.includes(newEmpId)) {
        alert('This employee is already a member of this project.');
        return;
      }
      const updatedMemberIds = [...currentMemberIds, newEmpId];
      await updateProject(project.project_id, {
        member_ids: updatedMemberIds,
      });
      setIsAddMemberModalOpen(false);
      setSelectedNewMemberId('');
      await loadProjectData();
    } catch (err: any) {
      console.error('Failed to add employee to project:', err);
      alert(err?.detail || err?.message || 'Failed to add employee to project');
    } finally {
      setIsSubmittingAddMember(false);
    }
  };

  // Remove Member from Project Handler
  const handleRemoveMember = async (empId: number, empName: string) => {
    if (!project) return;
    if (empId === project.project_manager_id) {
      alert('Cannot remove the Project Manager from the project. Please change the PM first if needed.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${empName} from this project?`)) {
      return;
    }
    try {
      setIsRemovingMemberId(empId);
      const currentMemberIds = project.members?.map((m) => m.employee_id) || [];
      const updatedMemberIds = currentMemberIds.filter((id) => id !== empId);
      await updateProject(project.project_id, {
        member_ids: updatedMemberIds,
      });
      await loadProjectData();
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      alert(err?.detail || err?.message || 'Failed to remove member');
    } finally {
      setIsRemovingMemberId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 rounded-2xl border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading project workspace...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-white rounded-3xl border border-rose-200 text-center shadow-lg">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">Failed to load project</h2>
        <p className="text-xs text-slate-500 mb-6">{error || 'Project not found'}</p>
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>
      </div>
    );
  }

  const statusStyle = STATUS_CONFIGS[project.project_status] || STATUS_CONFIGS.new;

  const tabsList = [
    { id: 0, label: 'Project Details', icon: FileText },
    { id: 1, label: 'Team & Workload', icon: Users, badge: project.members?.length || 0 },
    { id: 2, label: 'Sprints', icon: Layers, badge: sprints.length },
    { id: 3, label: 'Tasks', icon: CheckSquare, badge: filteredTasks.length },
    { id: 4, label: 'Bugs', icon: Bug, badge: bugs.length },
    { id: 5, label: 'Discussion', icon: MessageSquare, badge: discussions.length },
    { id: 6, label: 'Activity Logs', icon: History, badge: activityLogs.length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Projects</span>
          </button>
          <div className="h-4 w-px bg-slate-300" />
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg">
              {project.project_no}
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {project.project_name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize border border-slate-200">
              {project.project_type}
            </span>
          </div>
        </div>

        {/* Status Dropdown & Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Status Badge with Dropdown for PM/Admin, static badge for employees */}
          {isManagerOrAdmin ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${statusStyle.bg}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                <span>{statusStyle.label}</span>
                <span className="text-[10px] text-slate-400 ml-1">▼</span>
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Update Status
                  </div>
                  {(Object.keys(STATUS_CONFIGS) as ProjectStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => promptStatusChange(st)}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 flex items-center justify-between text-slate-700"
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
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border ${statusStyle.bg}`}>
              <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
              <span>{statusStyle.label}</span>
            </div>
          )}

          {isManagerOrAdmin && (
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              New Task
            </button>
          )}

          <button
            onClick={() => setIsBugModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Bug className="w-3.5 h-3.5" />
            Report Bug
          </button>
        </div>
      </div>

      {/* Sleek KPI Metrics Strip (Compact & Non-intrusive for PM & Admin) */}
      {isManagerOrAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-3 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Est. Hours</span>
              <span className="font-extrabold text-slate-900">{kpiData.estHours} hrs</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Actual Hours</span>
              <span className="font-extrabold text-slate-900">{kpiData.actHours} hrs</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Start Date</span>
              <span className="font-bold text-slate-800">{kpiData.startDate}</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Flag className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Deadline</span>
              <span className="font-bold text-slate-800">{kpiData.estimatedEndDate}</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Delivered</span>
              <span className="font-bold text-slate-800">{kpiData.actualEndDate}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-1" aria-label="Tabs">
          {tabsList.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-bold rounded-2xl transition border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
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

      {/* TAB CONTENTS */}
      <div className="mt-4">
        {/* TAB 0: Project Details */}
        {activeTab === 0 && (
          <div className="space-y-6">
            {detailsSaveSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-semibold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {detailsSaveSuccess}
              </div>
            )}

            {/* Header / Edit Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Project Information & Configurations</h3>
                <p className="text-xs text-slate-500">
                  Switch between project overview, tech stack, and deployment credentials
                </p>
              </div>
              {isManagerOrAdmin && (
                <div>
                  {isEditingDetails ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingDetails(false)}
                        disabled={isSavingDetails}
                        className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDetails}
                        disabled={isSavingDetails}
                        className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {isSavingDetails ? 'Saving...' : 'Save All Changes'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingDetails(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Details
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3 Sub-Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setDetailsSubTab('overview')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
                  detailsSubTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Project Overview</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailsSubTab('tech')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
                  detailsSubTab === 'tech'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Tech Stack</span>
              </button>
              {isManagerOrAdmin && (
                <button
                  type="button"
                  onClick={() => setDetailsSubTab('deployment')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
                    detailsSubTab === 'deployment'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Deployment Details</span>
                </button>
              )}
            </div>

            {/* Sub-Tab 1: Overview & Client Information */}
            {detailsSubTab === 'overview' && (
              <div className={`grid gap-6 ${isManagerOrAdmin ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Project Core Meta */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Project Overview
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Project Name</span>
                    <span className="font-bold text-slate-800">{project.project_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Project No.</span>
                    <span className="font-mono font-bold text-blue-600">{project.project_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Type</span>
                    <span className="font-semibold text-slate-800 capitalize">{project.project_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Category</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {project.category.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Project Manager</span>
                    <span className="font-bold text-slate-800">{project.project_manager_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Current Status</span>
                    <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${statusStyle.bg}`}>
                      {statusStyle.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client & Additional Details (Section 3.3: Hidden for Employees) */}
              {isManagerOrAdmin && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Client Details
                    </h4>
                  </div>

                  {isEditingDetails ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Client Name
                        </label>
                        <input
                          type="text"
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                          placeholder="e.g. Acme Corporation"
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Lead Received Date
                          </label>
                          <input
                            type="date"
                            value={editLeadReceivedDate}
                            onChange={(e) => setEditLeadReceivedDate(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Project Approved Date
                          </label>
                          <input
                            type="date"
                            value={editProjectApprovedDate}
                            onChange={(e) => setEditProjectApprovedDate(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Client Name</span>
                        <span className="font-bold text-slate-800">
                          {project.client_name || 'Not specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Lead Received</span>
                        <span className="font-semibold text-slate-800">
                          {project.lead_received_date
                            ? new Date(project.lead_received_date).toLocaleDateString('en-GB')
                            : 'Not specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Project Approved</span>
                        <span className="font-semibold text-slate-800">
                          {project.project_approved_date
                            ? new Date(project.project_approved_date).toLocaleDateString('en-GB')
                            : 'Not specified'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Sub-Tab 2: Tech-Stack Details (Section 2.4 BFD) */}
            {detailsSubTab === 'tech' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Code className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Technology Stack Details (Section 2.4)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Visible to all project members to understand the application architecture
                  </p>
                </div>
              </div>

              {isEditingDetails ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Front-End Technologies
                    </label>
                    <textarea
                      rows={3}
                      value={editTechFrontend}
                      onChange={(e) => setEditTechFrontend(e.target.value)}
                      placeholder="e.g. Next.js 14, Tailwind CSS, TypeScript"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Back-End Technologies
                    </label>
                    <textarea
                      rows={3}
                      value={editTechBackend}
                      onChange={(e) => setEditTechBackend(e.target.value)}
                      placeholder="e.g. NestJS, Prisma ORM, PostgreSQL"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cloud Platform / Infra
                    </label>
                    <textarea
                      rows={3}
                      value={editTechCloud}
                      onChange={(e) => setEditTechCloud(e.target.value)}
                      placeholder="e.g. AWS S3, Vercel, Supabase"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Front-End
                    </span>
                    <p className="text-xs font-semibold text-slate-800 whitespace-pre-wrap">
                      {project.tech_frontend || 'Not specified'}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Back-End
                    </span>
                    <p className="text-xs font-semibold text-slate-800 whitespace-pre-wrap">
                      {project.tech_backend || 'Not specified'}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Cloud Platform
                    </span>
                    <p className="text-xs font-semibold text-slate-800 whitespace-pre-wrap">
                      {project.tech_cloud || 'Not specified'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Sub-Tab 3: Deployment & Production Credentials (Section 2.5 BFD - Hidden for Employees per Section 3.3) */}
            {detailsSubTab === 'deployment' && isManagerOrAdmin && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Deployment Details & Credentials (Section 2.5)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Production environments, domain links, and secure administrative login pairs
                  </p>
                </div>
              </div>

              {isEditingDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Vercel Account
                      </label>
                      <input
                        type="text"
                        value={editVercelAccount}
                        onChange={(e) => setEditVercelAccount(e.target.value)}
                        placeholder="e.g. vernoxy-team"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Vercel Link
                      </label>
                      <input
                        type="url"
                        value={editVercelLink}
                        onChange={(e) => setEditVercelLink(e.target.value)}
                        placeholder="https://vercel.com/..."
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Domain Link
                      </label>
                      <input
                        type="url"
                        value={editDomainLink}
                        onChange={(e) => setEditDomainLink(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Storage Account
                      </label>
                      <input
                        type="text"
                        value={editStorageAccount}
                        onChange={(e) => setEditStorageAccount(e.target.value)}
                        placeholder="e.g. s3-bucket-main"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Deployment Date
                      </label>
                      <input
                        type="date"
                        value={editDeploymentDate}
                        onChange={(e) => setEditDeploymentDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Go Live Date
                      </label>
                      <input
                        type="date"
                        value={editGoLiveDate}
                        onChange={(e) => setEditGoLiveDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Deployment Done By
                      </label>
                      <select
                        value={editDeploymentDoneBy}
                        onChange={(e) => setEditDeploymentDoneBy(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      >
                        <option value="">Select Employee</option>
                        {employees.map((emp) => (
                          <option key={emp.emp_id} value={emp.emp_id}>
                            {emp.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Admin Login Link
                      </label>
                      <input
                        type="url"
                        value={editAdminLoginLink}
                        onChange={(e) => setEditAdminLoginLink(e.target.value)}
                        placeholder="https://example.com/admin"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Credentials Editor */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">Admin Credentials Pairs</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditCredentials([
                            ...editCredentials,
                            { admin_label: 'Admin', admin_id: '', admin_password: '' },
                          ])
                        }
                        className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Credential Pair
                      </button>
                    </div>
                    <div className="space-y-2">
                      {editCredentials.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Label (e.g. SuperAdmin)"
                            value={c.admin_label}
                            onChange={(e) => {
                              const copy = [...editCredentials];
                              copy[idx].admin_label = e.target.value;
                              setEditCredentials(copy);
                            }}
                            className="w-1/4 px-3 py-1.5 text-xs border border-slate-200 rounded-xl"
                          />
                          <input
                            type="text"
                            placeholder="Admin ID / Email"
                            value={c.admin_id}
                            onChange={(e) => {
                              const copy = [...editCredentials];
                              copy[idx].admin_id = e.target.value;
                              setEditCredentials(copy);
                            }}
                            className="w-1/3 px-3 py-1.5 text-xs border border-slate-200 rounded-xl"
                          />
                          <input
                            type="text"
                            placeholder="Password"
                            value={c.admin_password}
                            onChange={(e) => {
                              const copy = [...editCredentials];
                              copy[idx].admin_password = e.target.value;
                              setEditCredentials(copy);
                            }}
                            className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditCredentials(editCredentials.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Vercel Account</span>
                      <span className="font-semibold text-slate-800">
                        {project.deployment?.vercel_account || 'Not specified'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Vercel Link</span>
                      {project.deployment?.vercel_link ? (
                        <a
                          href={project.deployment.vercel_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          Visit Preview <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Not specified</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Domain Link</span>
                      {project.deployment?.domain_link ? (
                        <a
                          href={project.deployment.domain_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          Visit Production <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Not specified</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Storage Account</span>
                      <span className="font-semibold text-slate-800">
                        {project.deployment?.storage_account || 'Not specified'}
                      </span>
                    </div>
                  </div>

                  {/* Credentials Cards */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Configured Administrative Logins
                    </span>
                    {project.credentials && project.credentials.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {project.credentials.map((cred, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                {cred.admin_label || 'Admin'}
                              </span>
                              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="text-slate-700 font-mono font-medium truncate">
                                ID: {cred.admin_id}
                              </div>
                              <div className="flex items-center justify-between text-slate-700 font-mono text-[11px]">
                                <span>PWD: ••••••••</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(cred.admin_password_encrypted || '');
                                    alert('Password copied to clipboard!');
                                  }}
                                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" /> Copy
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No credentials configured yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

        {/* TAB 1: Team & Workload */}
        {activeTab === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Project Team & Assignments</h3>
                <p className="text-xs text-slate-500">
                  Assigned Project Manager, cross-functional team members, and workload analysis
                </p>
              </div>
            </div>

            {/* Project Manager Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg border border-white/30">
                  {project.project_manager_name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Project Manager
                  </span>
                  <h4 className="text-lg font-bold mt-1">{project.project_manager_name}</h4>
                  <p className="text-xs text-blue-100">{project.project_manager_email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs bg-white/10 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/20 hidden lg:block">
                  Primary coordinator for milestone deliveries and sprint planning
                </div>
                {isManagerOrAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNewPmId(String(project.project_manager_id));
                      setIsChangePmModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold backdrop-blur-sm border border-white/20 transition shadow-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Change PM
                  </button>
                )}
              </div>
            </div>

            {/* Team Members Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Assigned Team Members ({project.members?.length || 0})
                </h4>
                {isManagerOrAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNewMemberId('');
                      setIsAddMemberModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold shadow-xs transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add Member
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {project.members && project.members.length > 0 ? (
                  project.members.map((member) => {
                    const memberSummary = personWiseSummary.find((s) => s.emp_id === member.employee_id);
                    return (
                      <div
                        key={member.employee_id}
                        className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm border border-slate-200 shrink-0">
                              {member.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-900 truncate">{member.name}</h5>
                              <span className="text-[10px] font-semibold text-slate-400 block truncate">
                                {member.role_in_project || 'Member'}
                              </span>
                              <span className="text-[11px] text-slate-500 truncate block">
                                {member.email}
                              </span>
                            </div>
                          </div>

                          {isManagerOrAdmin && member.employee_id !== project.project_manager_id && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.employee_id, member.name)}
                              disabled={isRemovingMemberId === member.employee_id}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition shrink-0"
                              title={`Remove ${member.name} from project`}
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] block">Tasks</span>
                            <span className="font-bold text-slate-800">
                              {memberSummary?.totalTasks || 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Done</span>
                            <span className="font-bold text-emerald-600">
                              {memberSummary?.completedTasks || 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Worked</span>
                            <span className="font-bold text-blue-600">
                              {memberSummary?.hoursWorked || 0}h
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No team members assigned yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Period Filter & Person-Wise Workload Summary Section */}
            {isManagerOrAdmin && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden mt-6">
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Period Filter & Team Workload</h4>
                    <p className="text-xs text-slate-500">
                      Filter by date period or project member to analyze individual task metrics
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="text-[11px] font-medium text-slate-400">From:</span>
                      <input
                        type="date"
                        value={periodStartDate}
                        onChange={(e) => setPeriodStartDate(e.target.value)}
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="text-[11px] font-medium text-slate-400">To:</span>
                      <input
                        type="date"
                        value={periodEndDate}
                        onChange={(e) => setPeriodEndDate(e.target.value)}
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <select
                      value={selectedEmpFilter}
                      onChange={(e) => setSelectedEmpFilter(e.target.value)}
                      className="px-3 py-1 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                    >
                      <option value="all">All Members</option>
                      {project.members?.map((m) => (
                        <option key={m.employee_id} value={m.employee_id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    {(periodStartDate || periodEndDate || selectedEmpFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setPeriodStartDate('');
                          setPeriodEndDate('');
                          setSelectedEmpFilter('all');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600"
                        title="Reset Filters"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Person-wise Summary Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/30 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-5">Employee</th>
                        <th className="py-3 px-4 text-center">Total Tasks</th>
                        <th className="py-3 px-4 text-center">Completed</th>
                        <th className="py-3 px-4 text-center">Estimated Hours</th>
                        <th className="py-3 px-4 text-center">Hours Worked</th>
                        <th className="py-3 px-5 text-center">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {personWiseSummary.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                            No team members assigned yet
                          </td>
                        </tr>
                      ) : (
                        personWiseSummary.map((item) => (
                          <tr key={item.emp_id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                                  {item.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{item.name}</div>
                                  <div className="text-[10px] text-slate-400">{item.role}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-semibold">{item.totalTasks}</td>
                            <td className="py-3 px-4 text-center font-semibold text-emerald-600">
                              {item.completedTasks}
                            </td>
                            <td className="py-3 px-4 text-center font-medium text-slate-600">
                              {item.estimatedHours} hrs
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-blue-600">
                              {item.hoursWorked} hrs
                            </td>
                            <td className="py-3 px-5">
                              <div className="flex items-center justify-center gap-2 max-w-[120px] mx-auto">
                                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500">
                                  {item.progress}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Sprint Tab */}
        {activeTab === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Project Sprints</h3>
                <p className="text-xs text-slate-500">
                  Fixed cycles for planning, implementing, and delivering features
                </p>
              </div>
              {isManagerOrAdmin && (
                <button
                  onClick={() => setIsSprintModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Sprint
                </button>
              )}
            </div>

            {sprints.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800 mb-1">No Sprints Defined</h4>
                <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
                  Organize work into 1-4 week sprints to track progress against project milestones.
                </p>
                {isManagerOrAdmin && (
                  <button
                    onClick={() => setIsSprintModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                  >
                    Create First Sprint
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {sprints.map((sprint) => {
                  const sprintTasks = tasks.filter((t) => t.sprint_id === sprint.sprint_id);
                  const completed = sprintTasks.filter(
                    (t) => t.stage === 'completed' || t.status === 'completed'
                  ).length;
                  const progress =
                    sprintTasks.length > 0 ? Math.round((completed / sprintTasks.length) * 100) : 0;

                  return (
                    <div
                      key={sprint.sprint_id}
                      className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              sprint.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : sprint.status === 'in_progress'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {sprint.status.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            #{sprint.sprint_id}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900 mb-1">
                          {sprint.sprint_name}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {sprint.sprint_goal || 'No goal specified for this sprint.'}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            {new Date(sprint.start_date).toLocaleDateString('en-GB')} –{' '}
                            {new Date(sprint.end_date).toLocaleDateString('en-GB')}
                          </span>
                          <span className="font-bold text-slate-700">
                            {completed}/{sprintTasks.length} tasks
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="pt-2 flex items-center justify-between">
                          <button
                            onClick={() => {
                              setSelectedSprintFilter(String(sprint.sprint_id));
                              setActiveTab(3); // Switch to tasks tab
                            }}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            View Sprint Tasks →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Tasks Tab (Pure Kanban Board & Sprint/Assignee Filtering) */}
        {activeTab === 3 && (
          <div className="space-y-4">
            {/* Action Bar & Sub-Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                    title="Reset Board Filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBugModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition"
                >
                  <Bug className="w-3.5 h-3.5" />
                  Report Bug
                </button>
                {isManagerOrAdmin && (
                  <>
                    <button
                      onClick={() => setIsSprintModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Add Sprint
                    </button>
                    <button
                      onClick={() => setIsTaskModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      Create Task
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Drag & Drop Kanban Board */}
            <div className="overflow-x-auto pb-4">
              <TaskBoard
                board={taskBoardDto}
                isAdmin={isAdmin}
                onCardClick={(taskId) => setSelectedDrawerTaskId(taskId)}
                onMoveStage={handleMoveStage}
              />
            </div>
          </div>
        )}

        {/* TAB 4: Bugs Tab (Dedicated Bug Tracker & Lifecycle Management) */}
        {activeTab === 4 && (
          <div className="space-y-5">
            {/* Bug Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Bugs</div>
                <div className="text-xl font-black text-slate-900">{bugStats.total}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Open / New</div>
                <div className="text-xl font-black text-rose-600">{bugStats.open}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">In Dev</div>
                <div className="text-xl font-black text-amber-600">{bugStats.dev}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">In QA</div>
                <div className="text-xl font-black text-indigo-600">{bugStats.qa}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Resolved</div>
                <div className="text-xl font-black text-emerald-600">{bugStats.done}</div>
              </div>
            </div>

            {/* Bugs Filter & Action Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search */}
                <div className="relative min-w-[200px] flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={bugSearch}
                    onChange={(e) => setBugSearch(e.target.value)}
                    placeholder="Search bug title, code, assignee..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  {bugSearch && (
                    <button
                      onClick={() => setBugSearch('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <select
                  value={bugStatusFilter}
                  onChange={(e) => setBugStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New</option>
                  <option value="open">Open</option>
                  <option value="ready_for_dev">Ready for Dev</option>
                  <option value="dev_in_progress">Dev in Progress</option>
                  <option value="ready_for_qa">Ready for QA</option>
                  <option value="qa_in_progress">QA in Progress</option>
                  <option value="done">Done / Resolved</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={bugPriorityFilter}
                  onChange={(e) => setBugPriorityFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {(bugSearch || bugStatusFilter !== 'all' || bugPriorityFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setBugSearch('');
                      setBugStatusFilter('all');
                      setBugPriorityFilter('all');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                    title="Reset Bug Filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsBugModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Report Bug
              </button>
            </div>

            {/* Bugs Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              {filteredBugs.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Bug className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-medium">No bugs matching the current filters.</p>
                  <p className="text-[11px] text-slate-400">Try adjusting your search or report a new defect.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Bug Code</th>
                        <th className="py-3 px-4">Title</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Priority</th>
                        <th className="py-3 px-4">Assigned To</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Created</th>
                        <th className="py-3 px-4 text-center">Lifecycle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredBugs.map((bug) => (
                        <tr
                          key={bug.bug_id}
                          onClick={() => setSelectedBugId(bug.bug_id)}
                          className="hover:bg-slate-50/80 cursor-pointer transition group"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-rose-600 group-hover:underline">
                            {bug.bug_code}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                            {bug.title}
                          </td>
                          <td className="py-3 px-3 capitalize font-medium text-slate-600">
                            {bug.bug_type}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                bug.priority === 'high'
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : bug.priority === 'medium'
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {bug.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {bug.assigned_to_name || `Emp #${bug.assigned_to}`}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize ${
                                bug.status === 'done'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : bug.status.includes('qa')
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : bug.status.includes('dev')
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {bug.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                            {new Date(bug.created_at).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-[11px] font-semibold text-blue-600 group-hover:underline">
                              View Details →
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Discussion Tab */}
        {activeTab === 5 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[650px] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Project Discussions ({discussions.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Collaborate with the project manager and assigned team
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {discussions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                  <MessageSquare className="w-10 h-10 text-slate-300" />
                  <p className="text-xs">No discussion messages yet. Start the conversation!</p>
                </div>
              ) : (
                discussions.map((msg) => {
                  const isCurrentUser = msg.sender_emp_id === user?.emp_id;
                  return (
                    <div
                      key={msg.message_id}
                      className={`flex items-start gap-3 ${
                        isCurrentUser ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {msg.sender_name ? msg.sender_name.substring(0, 2).toUpperCase() : 'U'}
                      </div>
                      <div
                        className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 ${
                          isCurrentUser
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-slate-100 text-slate-800 rounded-tl-none'
                        }`}
                      >
                        <div
                          className={`flex items-center justify-between gap-3 text-[10px] ${
                            isCurrentUser ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          <span className="font-bold">{msg.sender_name}</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Box */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Type your discussion message here..."
                className="flex-1 px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim() || isSendingMessage}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: Activity Logs Tab */}
        {activeTab === 6 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Activity & Audit Trail ({activityLogs.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Chronological audit log of all project updates, status changes, and task actions
                  </p>
                </div>
              </div>
            </div>

            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">
                No activity records logged yet for this project.
              </p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {activityLogs.map((log) => (
                  <div key={log.log_id} className="relative flex items-start gap-3 text-xs">
                    <div className="absolute -left-6 mt-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                    <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">{log.actor_name}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.created_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-mono text-[9px] uppercase font-bold">
                          {log.action_type}
                        </span>
                        <p className="text-slate-600">{log.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Drawer */}
      <TaskDrawer
        task={drawerTaskDetail}
        isOpen={selectedDrawerTaskId !== null}
        isAdmin={isAdmin}
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
        }}
      />

      {/* Create Sprint Modal */}
      <CreateSprintModal
        projectId={projectId}
        projectStartDate={project.start_date}
        projectDeadline={project.deadline}
        isOpen={isSprintModalOpen}
        onClose={() => setIsSprintModalOpen(false)}
        onSubmit={handleCreateSprint}
      />

      {/* Create Project Task Modal */}
      <CreateProjectTaskModal
        projectId={projectId}
        projectMembers={project.members || []}
        sprints={sprints}
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateTask}
      />

      {/* Create Bug Modal */}
      <CreateBugModal
        projectId={projectId}
        projectMembers={project.members || []}
        tasks={tasks}
        isOpen={isBugModalOpen}
        onClose={() => setIsBugModalOpen(false)}
        onSubmit={handleCreateBug}
      />

      {/* Bug Details Popup (Section 3.5, 3.6, 3.7) */}
      <BugDetailsModal
        projectId={projectId}
        bugId={selectedBugId}
        isOpen={selectedBugId !== null}
        onClose={() => setSelectedBugId(null)}
        onBugUpdated={loadProjectData}
      />

      {/* Reason Modal for On-Hold or Cancelled Status (BFD Section 2.8) */}
      {targetStatusChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-base font-bold text-slate-900">
                Reason Required ({STATUS_CONFIGS[targetStatusChange]?.label})
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              As per project management rules, moving a project to {STATUS_CONFIGS[targetStatusChange]?.label} requires a detailed reason for tracking.
            </p>
            <textarea
              rows={3}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Provide a mandatory reason..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTargetStatusChange(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!statusReason.trim() || isSubmittingStatus}
                onClick={() => executeStatusUpdate(targetStatusChange, statusReason.trim())}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md disabled:opacity-50"
              >
                {isSubmittingStatus ? 'Updating...' : 'Confirm Status Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change PM Modal */}
      {isChangePmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Change Project Manager</h4>
                  <p className="text-[11px] text-slate-400">Reassign primary project ownership</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePmModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5 tracking-wider">
                  Current PM
                </span>
                <span className="font-bold text-slate-800">{project.project_manager_name}</span>
                <span className="text-slate-400 block text-[11px]">{project.project_manager_email}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select New Project Manager <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedNewPmId}
                  onChange={(e) => setSelectedNewPmId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">-- Choose an active employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.emp_id} value={emp.emp_id}>
                      {emp.name} ({emp.email}) - {emp.role_name || 'Member'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/60 text-[11px] text-amber-800">
                Note: The newly selected manager will receive coordinator rights and be automatically included in the project team.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsChangePmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedNewPmId || Number(selectedNewPmId) === project.project_manager_id || isSubmittingPmChange}
                onClick={handleChangePm}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md disabled:opacity-50 transition"
              >
                {isSubmittingPmChange ? 'Reassigning...' : 'Confirm New PM'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Add Team Member</h4>
                  <p className="text-[11px] text-slate-400">Assign an active employee to this project</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Active Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedNewMemberId}
                  onChange={(e) => setSelectedNewMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">-- Choose an employee to add --</option>
                  {employees
                    .filter((emp) => !project.members?.some((m) => m.employee_id === emp.emp_id))
                    .map((emp) => (
                      <option key={emp.emp_id} value={emp.emp_id}>
                        {emp.name} ({emp.email}) - {emp.role_name || 'Member'}
                      </option>
                    ))}
                </select>
              </div>

              {employees.filter((emp) => !project.members?.some((m) => m.employee_id === emp.emp_id)).length === 0 && (
                <p className="text-[11px] text-slate-400 italic">
                  All active employees are already assigned to this project.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedNewMemberId || isSubmittingAddMember}
                onClick={handleAddMember}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md disabled:opacity-50 transition"
              >
                {isSubmittingAddMember ? 'Adding...' : 'Add to Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
