import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  CheckCircle2,
  RotateCw,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../core/socket/SocketContext';
import {
  createProject,
  fetchAssignableEmployees,
  fetchProjects,
  updateProject,
  updateProjectStatus,
} from '../api/projects.api';
import type {
  AssignableEmployee,
  CreateProjectPayload,
  ProjectItem,
  ProjectStatus,
} from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectTableView } from '../components/ProjectTableView';
import { ProjectKanbanView } from '../components/ProjectKanbanView';
import { ProjectFilterBar, ViewMode } from '../components/ProjectFilterBar';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { ProjectDetailsModal } from '../components/ProjectDetailsModal';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [employees, setEmployees] = useState<AssignableEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View & Filters
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pmFilter, setPmFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  const canCreate = Boolean(
    user?.access?.can_manage_organization ||
      user?.role?.role_name?.toLowerCase().includes('admin') ||
      user?.role?.role_name?.toLowerCase().includes('manager')
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const statusParam = viewMode === 'kanban' ? undefined : (statusFilter !== 'all' ? statusFilter : undefined);
      const [projectsData, employeesData] = await Promise.all([
        fetchProjects({
          status: statusParam,
          project_manager_id: pmFilter !== 'all' ? Number(pmFilter) : undefined,
          start_date: startDateFilter || undefined,
          end_date: endDateFilter || undefined,
          search: search || undefined,
        }),
        fetchAssignableEmployees(),
      ]);
      setProjects(projectsData);
      setEmployees(employeesData);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError('Could not load projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, pmFilter, startDateFilter, endDateFilter, viewMode]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleProjectStatusChanged = (payload: any) => {
      if (payload?.projectId && payload?.status) {
        setProjects((prev) =>
          prev.map((p) =>
            p.project_id === payload.projectId
              ? {
                  ...p,
                  project_status: payload.status,
                  status_change_reason: payload.reason || p.status_change_reason,
                }
              : p
          )
        );
      } else {
        loadData().catch(console.error);
      }
    };

    socket.on('project:status_changed', handleProjectStatusChanged);
    return () => {
      socket.off('project:status_changed', handleProjectStatusChanged);
    };
  }, [socket]);

  // Client-side quick filter on search for snappy UX
  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase().trim();
    return projects.filter(
      (p) =>
        p.project_name.toLowerCase().includes(q) ||
        p.project_no.toLowerCase().includes(q) ||
        (p.client_name && p.client_name.toLowerCase().includes(q)) ||
        p.project_manager_name.toLowerCase().includes(q)
    );
  }, [projects, search]);

  const stats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) => p.project_status === 'in_progress').length;
    const delivered = projects.filter((p) => p.project_status === 'delivered').length;
    const onHold = projects.filter((p) => p.project_status === 'on_hold').length;
    return { total, inProgress, delivered, onHold };
  }, [projects]);

  const handleCreateProject = async (payload: CreateProjectPayload): Promise<ProjectItem> => {
    const newProject = await createProject(payload);
    // Add immediately to projects state so the project card appears right away
    setProjects((prev) => [newProject, ...prev.filter((p) => p.project_id !== newProject.project_id)]);
    loadData().catch(console.error);
    return newProject;
  };

  const handleUpdateProjectDetails = async (
    projectId: number,
    payload: Partial<CreateProjectPayload>
  ): Promise<ProjectItem> => {
    const updated = await updateProject(projectId, payload);
    setProjects((prev) =>
      prev.map((p) => (p.project_id === projectId ? updated : p))
    );
    if (selectedProject?.project_id === projectId) {
      setSelectedProject(updated);
    }
    return updated;
  };

  const handleUpdateStatus = async (
    projectId: number,
    newStatus: ProjectStatus,
    reason?: string
  ) => {
    const updated = await updateProjectStatus(projectId, newStatus, reason);
    setProjects((prev) =>
      prev.map((p) => (p.project_id === projectId ? updated : p))
    );
    if (selectedProject?.project_id === projectId) {
      setSelectedProject(updated);
    }
  };

  const hasActiveFilters =
    statusFilter !== 'all' ||
    pmFilter !== 'all' ||
    Boolean(startDateFilter) ||
    Boolean(endDateFilter) ||
    Boolean(search);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setPmFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
    setSearch('');
  };

  return (
    <div className="space-y-3.5 w-full min-w-0 max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-blue-600">Projects</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Projects
          </h1>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Create Project
          </button>
        )}
      </div>

      {/* KPI Stats Strip matching Image 3 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">{stats.total}</h3>
            <span className="text-[11px] font-medium text-slate-400">Total</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <RotateCw className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">{stats.inProgress}</h3>
            <span className="text-[11px] font-medium text-slate-400">In Progress</span>
          </div>
        </div>

        {/* Delivered */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">{stats.delivered}</h3>
            <span className="text-[11px] font-medium text-slate-400">Delivered</span>
          </div>
        </div>

        {/* On Hold */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">{stats.onHold}</h3>
            <span className="text-[11px] font-medium text-slate-400">On Hold</span>
          </div>
        </div>
      </div>

      {/* Filter and View Mode Switcher */}
      <ProjectFilterBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        projectManagerId={pmFilter}
        onProjectManagerChange={setPmFilter}
        startDate={startDateFilter}
        onStartDateChange={setStartDateFilter}
        endDate={endDateFilter}
        onEndDateChange={setEndDateFilter}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        managers={employees}
      />

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-2xl h-52 border border-slate-200 p-5 space-y-4">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-6 bg-slate-200 rounded w-2/3" />
              <div className="h-4 bg-slate-100 rounded w-full" />
              <div className="h-2 bg-slate-100 rounded w-full mt-6" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">Failed to load projects</h3>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl"
          >
            Retry
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-md mx-auto shadow-xs">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Projects Found</h3>
          <p className="text-xs text-slate-500 mb-6">
            {hasActiveFilters
              ? 'No projects matched the selected filters. Try adjusting or clearing your filters.'
              : 'There are no projects assigned or created yet. Start by creating your first project.'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              Clear All Filters
            </button>
          ) : canCreate ? (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 transition"
            >
              Create Project
            </button>
          ) : null}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.project_id}
              project={project}
              onClick={(p) => navigate(`/projects/${p.project_id}`)}
              onStatusChange={(p, s) => handleUpdateStatus(p.project_id, s)}
            />
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <ProjectTableView
          projects={filteredProjects}
          onSelectProject={(p) => navigate(`/projects/${p.project_id}`)}
        />
      ) : (
        <ProjectKanbanView
          projects={filteredProjects}
          onSelectProject={(p) => navigate(`/projects/${p.project_id}`)}
          onStatusChange={handleUpdateStatus}
          activeStatus={statusFilter}
        />
      )}

      {/* 3-Step Create Project Wizard Modal */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateProject}
        onUpdateDetails={handleUpdateProjectDetails}
        employees={employees}
      />

      {/* Project Details Modal */}
      <ProjectDetailsModal
        project={selectedProject}
        isOpen={Boolean(selectedProject)}
        onClose={() => setSelectedProject(null)}
        onStatusUpdate={handleUpdateStatus}
        onUpdateProject={handleUpdateProjectDetails}
        employees={employees}
        canManageStatus={canCreate}
      />
    </div>
  );
};
