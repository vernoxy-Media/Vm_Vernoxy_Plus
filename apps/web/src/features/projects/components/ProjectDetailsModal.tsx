import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Server,
  Code2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import type { ProjectItem, ProjectStatus } from '../types';
import { SprintsAndTasksView } from './SprintsAndTasksView';

interface ProjectDetailsModalProps {
  project: ProjectItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (projectId: number, newStatus: ProjectStatus, reason?: string) => Promise<void>;
  canManageStatus?: boolean;
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  project,
  isOpen,
  onClose,
  onStatusUpdate,
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

              {/* PM & Key Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PM Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Project Manager
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                      {project.project_manager_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {project.project_manager_name}
                      </h4>
                      <p className="text-xs text-slate-500">{project.project_manager_email}</p>
                    </div>
                  </div>
                </div>

                {/* Client / Project Nature */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Engagement & Category
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Client:</span>
                      <span className="font-semibold text-slate-800">
                        {project.client_name || 'Internal / Not Specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
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
                </div>
              </div>
            </>
          )}

          {activeTab === 'sprints' && (
            <SprintsAndTasksView project={project} canManageSprints={true} />
          )}

          {activeTab === 'deployment' && (
            <div className="space-y-6">
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
                      {project.deployment?.vercel_account || 'Production'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Live Domain URL</span>
                    <span className="font-semibold text-slate-800 break-all">
                      {project.deployment?.domain_link || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Vercel Project Link</span>
                    <span className="font-semibold text-slate-800 break-all">
                      {project.deployment?.vercel_link || 'Not specified'}
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
                      {project.deployment?.deployment_done_by_name || 'System / PM'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Admin Login Link</span>
                    <span className="font-semibold text-slate-800 break-all">
                      {project.deployment?.admin_login_link || 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credentials Section */}
              {project.credentials && project.credentials.length > 0 && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    Admin Login Credentials (Confidential)
                  </span>

                  <div className="space-y-2">
                    {project.credentials.map((cred, idx) => (
                      <div
                        key={cred.credential_id}
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
                </div>
              )}

              {/* Tech Stack */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-indigo-600" />
                  Tech-Stack Architecture
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Frontend
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {project.tech_frontend || 'React / TypeScript'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Backend
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {project.tech_backend || 'NestJS / Node.js'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Cloud & Database
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {project.tech_cloud || 'PostgreSQL / Prisma'}
                    </span>
                  </div>
                </div>
              </div>
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
