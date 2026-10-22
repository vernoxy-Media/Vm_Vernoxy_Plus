import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Server,
  Code2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  AssignableEmployee,
  CreateProjectPayload,
  ProjectItem,
  ProjectStatus,
} from '../types';
import { SprintsAndTasksView } from './SprintsAndTasksView';

interface ProjectDetailsModalProps {
  project: ProjectItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (projectId: number, newStatus: ProjectStatus, reason?: string) => Promise<void>;
  onUpdateProject?: (projectId: number, payload: Partial<CreateProjectPayload>) => Promise<ProjectItem>;
  employees?: AssignableEmployee[];
  canManageStatus?: boolean;
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  project,
  isOpen,
  onClose,
  onStatusUpdate,
  onUpdateProject,
  employees = [],
  canManageStatus = false,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sprints' | 'deployment' | 'members' | 'status'>('overview');
  const [showPasswordIdx, setShowPasswordIdx] = useState<number | null>(null);

  // Status change state
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus>(
    project?.project_status || 'planning'
  );
  const [statusReason, setStatusReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState(false);

  // Deployment & Tech-Stack Edit State
  const [isEditingDeployment, setIsEditingDeployment] = useState(false);
  const [isSavingDeployment, setIsSavingDeployment] = useState(false);
  const [deploymentSuccessMsg, setDeploymentSuccessMsg] = useState<string | null>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);

  const [editVercelAccount, setEditVercelAccount] = useState('');
  const [editVercelLink, setEditVercelLink] = useState('');
  const [editDomainLink, setEditDomainLink] = useState('');
  const [editStorageAccount, setEditStorageAccount] = useState('');
  const [editDeploymentDate, setEditDeploymentDate] = useState('');
  const [editGoLiveDate, setEditGoLiveDate] = useState('');
  const [editDeploymentDoneBy, setEditDeploymentDoneBy] = useState<number | ''>('');
  const [editAdminLoginLink, setEditAdminLoginLink] = useState('');
  const [editCredentials, setEditCredentials] = useState<
    Array<{ admin_label: string; admin_id: string; admin_password: string; showPassword?: boolean }>
  >([]);
  const [editTechFrontend, setEditTechFrontend] = useState('');
  const [editTechBackend, setEditTechBackend] = useState('');
  const [editTechCloud, setEditTechCloud] = useState('');

  // Overview / Additional Details Edit State
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [overviewSuccessMsg, setOverviewSuccessMsg] = useState<string | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [editClientName, setEditClientName] = useState('');
  const [editLeadReceivedDate, setEditLeadReceivedDate] = useState('');
  const [editProjectApprovedDate, setEditProjectApprovedDate] = useState('');

  // Synchronize edit fields whenever project changes
  useEffect(() => {
    if (project) {
      setSelectedStatus(project.project_status);
      setEditClientName(project.client_name || '');
      setEditLeadReceivedDate(
        project.lead_received_date ? project.lead_received_date.split('T')[0] : ''
      );
      setEditProjectApprovedDate(
        project.project_approved_date ? project.project_approved_date.split('T')[0] : ''
      );
      setEditVercelAccount(project.deployment?.vercel_account || '');
      setEditVercelLink(project.deployment?.vercel_link || '');
      setEditDomainLink(project.deployment?.domain_link || '');
      setEditStorageAccount(project.deployment?.storage_account || '');
      setEditDeploymentDate(
        project.deployment?.deployment_date ? project.deployment.deployment_date.split('T')[0] : ''
      );
      setEditGoLiveDate(
        project.deployment?.go_live_date ? project.deployment.go_live_date.split('T')[0] : ''
      );
      setEditDeploymentDoneBy(project.deployment?.deployment_done_by || '');
      setEditAdminLoginLink(project.deployment?.admin_login_link || '');
      setEditCredentials(
        project.credentials && project.credentials.length > 0
          ? project.credentials.map((c) => ({
              admin_label: c.admin_label,
              admin_id: c.admin_id,
              admin_password: c.admin_password_encrypted || '',
              showPassword: false,
            }))
          : []
      );
      setEditTechFrontend(project.tech_frontend || '');
      setEditTechBackend(project.tech_backend || '');
      setEditTechCloud(project.tech_cloud || '');
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Not set';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onStatusUpdate) return;
    try {
      setIsUpdatingStatus(true);
      await onStatusUpdate(project.project_id, selectedStatus, statusReason);
      setStatusSuccess(true);
      setTimeout(() => setStatusSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveAdditionalDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateProject || !project) return;
    try {
      setIsSavingOverview(true);
      setOverviewError(null);

      const payload: Partial<CreateProjectPayload> = {
        client_name: editClientName.trim() || undefined,
        lead_received_date: editLeadReceivedDate || undefined,
        project_approved_date: editProjectApprovedDate || undefined,
      };

      await onUpdateProject(project.project_id, payload);
      setOverviewSuccessMsg('Additional details saved successfully!');
      setTimeout(() => setOverviewSuccessMsg(null), 3000);
      setIsEditingOverview(false);
    } catch (err: any) {
      console.error(err);
      setOverviewError(err?.detail || err?.message || 'Failed to update additional details');
    } finally {
      setIsSavingOverview(false);
    }
  };

  const handleSaveDeploymentDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!onUpdateProject || !project) return;
    try {
      setIsSavingDeployment(true);
      setDeploymentError(null);

      const payload: Partial<CreateProjectPayload> = {
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

      await onUpdateProject(project.project_id, payload);
      setDeploymentSuccessMsg('Deployment & Tech-Stack details saved successfully!');
      setTimeout(() => setDeploymentSuccessMsg(null), 3000);
      setIsEditingDeployment(false);
    } catch (err: any) {
      console.error(err);
      setDeploymentError(err?.detail || err?.message || 'Failed to save deployment details');
    } finally {
      setIsSavingDeployment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
              {project.project_no}
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {project.project_name}
              </h2>
              <p className="text-xs text-slate-500 capitalize">
                {project.project_type} Project · {project.category.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Dates & Status Strip */}
        <div className="px-6 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Start Date
              </span>
              <span className="font-medium text-slate-200">
                {formatDate(project.start_date)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Deadline
              </span>
              <span className="font-medium text-slate-200">
                {formatDate(project.deadline)}
              </span>
            </div>
            {project.actual_end_date && (
              <div>
                <span className="text-emerald-400 block text-[10px] uppercase font-semibold">
                  Delivered On
                </span>
                <span className="font-medium text-emerald-200">
                  {formatDate(project.actual_end_date)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Current Status:</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-600 text-white shadow-sm">
              {project.project_status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('sprints')}
            className={`py-3.5 border-b-2 transition ${
              activeTab === 'sprints'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sprints & Tasks
          </button>
          <button
            onClick={() => setActiveTab('deployment')}
            className={`py-3.5 border-b-2 transition ${
              activeTab === 'deployment'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Deployment & Tech-Stack
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3.5 border-b-2 transition ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Team Members ({project.members.length})
          </button>
          {canManageStatus && (
            <button
              onClick={() => setActiveTab('status')}
              className={`py-3.5 border-b-2 transition ${
                activeTab === 'status'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Update Status
            </button>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Business Rules 2.8: Project Progress Bar */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700">Project Progress</span>
                  <span className="text-lg font-extrabold text-blue-600">
                    {project.progress_percentage}%
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(0, project.progress_percentage))}%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-emerald-600 font-bold text-sm block">
                      {project.completed_tasks_count}
                    </span>
                    <span className="text-[11px] text-slate-500">Completed Tasks</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-blue-600 font-bold text-sm block">
                      {Math.max(
                        0,
                        project.total_tasks_count - project.completed_tasks_count
                      )}
                    </span>
                    <span className="text-[11px] text-slate-500">Remaining Tasks</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-purple-600 font-bold text-sm block">
                      {project.total_tasks_count}
                    </span>
                    <span className="text-[11px] text-slate-500">Total Project Tasks</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-700 font-bold text-sm block">
                      {project.members.length}
                    </span>
                    <span className="text-[11px] text-slate-500">Assigned Team</span>
                  </div>
                </div>
              </div>

              {/* Success / Error Messages for Overview */}
              {overviewSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {overviewSuccessMsg}
                </div>
              )}
              {overviewError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {overviewError}
                </div>
              )}

              {/* PM & Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PM Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Project Manager
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                      {project.project_manager_name ? project.project_manager_name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {project.project_manager_name || 'Not assigned'}
                      </h4>
                      <p className="text-xs text-slate-500">{project.project_manager_email || ''}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Details (Section 2.3: Client, Lead Received Date, Approved Date) */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Additional Details (Client & Approval)
                    </span>
                    {onUpdateProject && !isEditingOverview && (
                      <button
                        type="button"
                        onClick={() => setIsEditingOverview(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </div>

                  {isEditingOverview ? (
                    <form onSubmit={handleSaveAdditionalDetails} className="space-y-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          Client Name
                        </label>
                        <input
                          type="text"
                          placeholder="Client / Organization Name"
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Lead Received Date
                          </label>
                          <input
                            type="date"
                            value={editLeadReceivedDate}
                            onChange={(e) => setEditLeadReceivedDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Approved Date
                          </label>
                          <input
                            type="date"
                            value={editProjectApprovedDate}
                            onChange={(e) => setEditProjectApprovedDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingOverview(false)}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingOverview}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                        >
                          {isSavingOverview ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Client:</span>
                        <span className="font-semibold text-slate-800">
                          {project.client_name || 'Not specified'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Lead Received Date:</span>
                        <span className="font-semibold text-slate-800">
                          {formatDate(project.lead_received_date)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Approved Date:</span>
                        <span className="font-semibold text-slate-800">
                          {formatDate(project.project_approved_date)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-500">Category:</span>
                        <span className="font-semibold text-slate-800 capitalize">
                          {project.category.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {project.status_change_reason && (
                        <div className="flex justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500">Status Note:</span>
                          <span className="font-medium text-slate-700 italic">
                            {project.status_change_reason}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'sprints' && (
            <SprintsAndTasksView project={project} canManageSprints={true} />
          )}

          {activeTab === 'deployment' && (
            <div className="space-y-6">
              {/* Header with Edit Button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Deployment & Tech-Stack</h3>
                  <p className="text-xs text-slate-500">
                    Optional technical credentials and architecture details (visible to Admin and PM)
                  </p>
                </div>
                {onUpdateProject && !isEditingDeployment && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDeployment(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Deployment & Tech-Stack
                  </button>
                )}
              </div>

              {/* Alert Messages */}
              {deploymentSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {deploymentSuccessMsg}
                </div>
              )}
              {deploymentError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {deploymentError}
                </div>
              )}

              {/* EDIT FORM MODE */}
              {isEditingDeployment ? (
                <form onSubmit={handleSaveDeploymentDetails} className="space-y-6">
                  {/* Top action banner */}
                  <div className="flex items-center justify-between bg-blue-50/70 p-3 rounded-xl border border-blue-200 text-xs">
                    <span className="font-semibold text-blue-900">
                      Editing Deployment and Tech-Stack
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingDeployment(false)}
                        className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-white rounded-lg font-semibold transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingDeployment}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50"
                      >
                        {isSavingDeployment ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>

                  {/* Section 2.5: Deployment Fields */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-blue-600" />
                      Deployment Configuration
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Vercel Account
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. vernoxy-prod"
                          value={editVercelAccount}
                          onChange={(e) => setEditVercelAccount(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Live Domain URL
                        </label>
                        <input
                          type="url"
                          placeholder="https://example.com"
                          value={editDomainLink}
                          onChange={(e) => setEditDomainLink(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Vercel Project Link
                        </label>
                        <input
                          type="url"
                          placeholder="https://vercel.com/..."
                          value={editVercelLink}
                          onChange={(e) => setEditVercelLink(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Storage Account / Bucket
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. AWS S3 / Cloudinary / Supabase"
                          value={editStorageAccount}
                          onChange={(e) => setEditStorageAccount(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Deployment Date
                        </label>
                        <input
                          type="date"
                          value={editDeploymentDate}
                          onChange={(e) => setEditDeploymentDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Go-Live Date
                        </label>
                        <input
                          type="date"
                          value={editGoLiveDate}
                          onChange={(e) => setEditGoLiveDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Deployment Done By
                        </label>
                        <select
                          value={editDeploymentDoneBy}
                          onChange={(e) => setEditDeploymentDoneBy(Number(e.target.value) || '')}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          <option value="">Select Employee</option>
                          {employees.map((emp) => (
                            <option key={emp.emp_id} value={emp.emp_id}>
                              {emp.name} {emp.role_name ? `(${emp.role_name})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Admin Login Link
                        </label>
                        <input
                          type="url"
                          placeholder="https://example.com/admin"
                          value={editAdminLoginLink}
                          onChange={(e) => setEditAdminLoginLink(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2.5: Admin Credentials */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-emerald-600" />
                        Admin Credentials
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditCredentials((prev) => [
                            ...prev,
                            { admin_label: 'Admin', admin_id: '', admin_password: '', showPassword: false },
                          ])
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Credential
                      </button>
                    </div>

                    {editCredentials.map((cred, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs">
                        <input
                          type="text"
                          placeholder="Label (e.g. Superadmin)"
                          value={cred.admin_label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditCredentials((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, admin_label: val } : c))
                            );
                          }}
                          className="w-1/4 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Admin ID / Email"
                          value={cred.admin_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditCredentials((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, admin_id: val } : c))
                            );
                          }}
                          className="w-1/3 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                        <div className="relative flex-1">
                          <input
                            type={cred.showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={cred.admin_password}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditCredentials((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, admin_password: val } : c))
                              );
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs pr-8"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setEditCredentials((prev) =>
                                prev.map((c, i) =>
                                  i === idx ? { ...c, showPassword: !c.showPassword } : c
                                )
                              )
                            }
                            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                          >
                            {cred.showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditCredentials((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Section 2.4: Tech Stack Fields */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-indigo-600" />
                      Tech-Stack Architecture (Section 2.4)
                    </span>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Frontend Technologies
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. React 19, TypeScript, TailwindCSS"
                        value={editTechFrontend}
                        onChange={(e) => setEditTechFrontend(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Backend Technologies
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. NestJS, Node.js, Express"
                        value={editTechBackend}
                        onChange={(e) => setEditTechBackend(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cloud Platform & Database
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. PostgreSQL, Prisma, AWS, Supabase"
                        value={editTechCloud}
                        onChange={(e) => setEditTechCloud(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Form Bottom Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDeployment(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingDeployment}
                      className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition"
                    >
                      {isSavingDeployment ? 'Saving...' : 'Save Details'}
                    </button>
                  </div>
                </form>
              ) : (
                /* VIEW MODE */
                <>
                  {/* Deployment Details */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Server className="w-4 h-4 text-blue-600" />
                        Deployment Details
                      </span>
                      {project.deployment?.domain_link && (
                        <a
                          href={project.deployment.domain_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Visit Live Site <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-white p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Hosting / Environment</span>
                        <span className="font-semibold text-slate-800">
                          {project.deployment?.vercel_account || 'Not specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Live Domain URL</span>
                        <span className="font-semibold text-slate-800 break-all">
                          {project.deployment?.domain_link ? (
                            <a
                              href={project.deployment.domain_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {project.deployment.domain_link}
                            </a>
                          ) : (
                            'Not specified'
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Vercel Project Link</span>
                        <span className="font-semibold text-slate-800 break-all">
                          {project.deployment?.vercel_link ? (
                            <a
                              href={project.deployment.vercel_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {project.deployment.vercel_link}
                            </a>
                          ) : (
                            'Not specified'
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Storage Account</span>
                        <span className="font-semibold text-slate-800">
                          {project.deployment?.storage_account || 'Not specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Deployment Date</span>
                        <span className="font-semibold text-slate-800">
                          {formatDate(project.deployment?.deployment_date)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Go-Live Date</span>
                        <span className="font-semibold text-slate-800">
                          {formatDate(project.deployment?.go_live_date)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Deployed By</span>
                        <span className="font-semibold text-slate-800">
                          {project.deployment?.deployment_done_by_name || 'Not specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Admin Login Link</span>
                        <span className="font-semibold text-slate-800 break-all">
                          {project.deployment?.admin_login_link ? (
                            <a
                              href={project.deployment.admin_login_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {project.deployment.admin_login_link}
                            </a>
                          ) : (
                            'Not specified'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Credentials Section */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      Admin Login Credentials (Confidential)
                    </span>

                    {project.credentials && project.credentials.length > 0 ? (
                      <div className="space-y-2">
                        {project.credentials.map((cred, idx) => (
                          <div
                            key={cred.credential_id || idx}
                            className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl text-xs"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 block">{cred.admin_label}</span>
                              <span className="text-slate-500 font-mono text-[11px]">
                                ID: {cred.admin_id}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                {showPasswordIdx === idx
                                  ? cred.admin_password_encrypted || '••••••••'
                                  : '••••••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowPasswordIdx(showPasswordIdx === idx ? null : idx)
                                }
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              >
                                {showPasswordIdx === idx ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic bg-white p-3 rounded-xl border border-slate-200">
                        No admin credentials configured yet. Click "Edit Deployment & Tech-Stack" to add credentials.
                      </p>
                    )}
                  </div>

                  {/* Tech Stack (Section 2.4) */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-indigo-600" />
                      Tech-Stack Architecture (Section 2.4)
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Frontend
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          {project.tech_frontend || 'Not specified'}
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Backend
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          {project.tech_backend || 'Not specified'}
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Cloud Platform
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          {project.tech_cloud || 'Not specified'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-600 block">
                Assigned Team Members ({project.members.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {project.members.map((m) => (
                  <div
                    key={m.member_id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{m.name}</h4>
                      <p className="text-[11px] text-slate-500 truncate">{m.email}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                      {m.role_in_project}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'status' && canManageStatus && (
            <form onSubmit={handleUpdateStatus} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Change Project Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="new">New</option>
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending">Pending</option>
                  <option value="review">Review</option>
                  <option value="on_hold">On Hold</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Change Reason / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide reason for status change (e.g., Client approved final delivery, waiting on assets, etc.)"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {statusSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Status updated successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingStatus}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
              >
                {isUpdatingStatus ? 'Saving...' : 'Save Status Update'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
