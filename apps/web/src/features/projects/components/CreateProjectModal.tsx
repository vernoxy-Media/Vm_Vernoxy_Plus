import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import type {
  AssignableEmployee,
  CreateProjectPayload,
  ProjectCategory,
  ProjectItem,
  ProjectStatus,
  ProjectType,
} from '../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateProjectPayload) => Promise<ProjectItem>;
  onUpdateDetails?: (projectId: number, payload: Partial<CreateProjectPayload>) => Promise<ProjectItem>;
  employees: AssignableEmployee[];
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdateDetails,
  employees,
}) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [createdProject, setCreatedProject] = useState<ProjectItem | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic Details
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('client');
  const [category, setCategory] = useState<ProjectCategory>('ecom_website');
  const [otherCategory, setOtherCategory] = useState('');
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('new');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [projectManagerId, setProjectManagerId] = useState<number | ''>('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [clientName, setClientName] = useState('');
  const [leadReceivedDate, setLeadReceivedDate] = useState('');
  const [projectApprovedDate, setProjectApprovedDate] = useState('');

  // Step 2: Deployment Details
  const [vercelAccount, setVercelAccount] = useState('');
  const [vercelLink, setVercelLink] = useState('');
  const [domainLink, setDomainLink] = useState('');
  const [storageAccount, setStorageAccount] = useState('');
  const [deploymentDate, setDeploymentDate] = useState('');
  const [goLiveDate, setGoLiveDate] = useState('');
  const [deploymentDoneBy, setDeploymentDoneBy] = useState<number | ''>('');
  const [adminLoginLink, setAdminLoginLink] = useState('');
  const [credentials, setCredentials] = useState<
    Array<{ admin_label: string; admin_id: string; admin_password: string; showPassword?: boolean }>
  >([]);

  // Step 3: Tech-Stack Details
  const [techFrontend, setTechFrontend] = useState('');
  const [techBackend, setTechBackend] = useState('');
  const [techCloud, setTechCloud] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleAddCredential = () => {
    setCredentials((prev) => [
      ...prev,
      { admin_label: 'Admin', admin_id: '', admin_password: '', showPassword: false },
    ]);
  };

  const handleRemoveCredential = (index: number) => {
    setCredentials((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCredentialChange = (
    index: number,
    field: 'admin_label' | 'admin_id' | 'admin_password' | 'showPassword',
    value: any
  ) => {
    setCredentials((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const toggleMember = (empId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const validateStep1 = (): boolean => {
    if (!projectName.trim()) {
      setError('Project name is required');
      return false;
    }
    if (!startDate) {
      setError('Start date is required');
      return false;
    }
    if (!deadline) {
      setError('End date / deadline is required');
      return false;
    }
    if (new Date(startDate) > new Date(deadline)) {
      setError('Deadline cannot be before start date');
      return false;
    }
    if (!projectManagerId) {
      setError('Please select a Project Manager');
      return false;
    }
    if (category === 'other' && !otherCategory.trim()) {
      setError('Please specify the category');
      return false;
    }
    setError(null);
    return true;
  };

  const handleCreateInitialProject = async (andContinue: boolean) => {
    if (!validateStep1()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: CreateProjectPayload = {
        project_name: projectName.trim(),
        project_type: projectType,
        category,
        other_category: category === 'other' ? otherCategory.trim() : undefined,
        project_status: projectStatus,
        start_date: startDate,
        deadline,
        project_manager_id: Number(projectManagerId),
        member_ids: selectedMemberIds,
        client_name: clientName.trim() || undefined,
        lead_received_date: leadReceivedDate || undefined,
        project_approved_date: projectApprovedDate || undefined,
      };

      const created = await onSubmit(payload);
      setCreatedProject(created);

      if (!andContinue) {
        handleClose();
      } else {
        handleClose();
        navigate(`/projects/${created.project_id}`);
      }
    } catch (err: any) {
      console.error('Error creating project:', err);
      const msg = err?.detail || err?.message || 'Failed to create project. Please check the inputs.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveBasicChanges = async () => {
    if (!createdProject || !onUpdateDetails) return;
    if (!validateStep1()) return;

    try {
      setIsSavingDetails(true);
      setError(null);

      const payload: Partial<CreateProjectPayload> = {
        project_name: projectName.trim(),
        project_type: projectType,
        category,
        other_category: category === 'other' ? otherCategory.trim() : undefined,
        project_status: projectStatus,
        start_date: startDate,
        deadline,
        project_manager_id: Number(projectManagerId),
        member_ids: selectedMemberIds,
        client_name: clientName.trim() || undefined,
        lead_received_date: leadReceivedDate || undefined,
        project_approved_date: projectApprovedDate || undefined,
      };

      const updated = await onUpdateDetails(createdProject.project_id, payload);
      setCreatedProject(updated);
      setSaveSuccessMsg('Basic details updated successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error updating basic details:', err);
      setError(err?.detail || err?.message || 'Failed to update basic details.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleSaveDeployment = async (andGoNext = false) => {
    if (!createdProject || !onUpdateDetails) {
      if (andGoNext) setCurrentStep(3);
      return;
    }

    try {
      setIsSavingDetails(true);
      setError(null);

      const payload: Partial<CreateProjectPayload> = {
        deployment:
          vercelAccount ||
          vercelLink ||
          domainLink ||
          storageAccount ||
          deploymentDate ||
          goLiveDate ||
          deploymentDoneBy ||
          adminLoginLink
            ? {
                vercel_account: vercelAccount.trim() || undefined,
                vercel_link: vercelLink.trim() || undefined,
                domain_link: domainLink.trim() || undefined,
                storage_account: storageAccount.trim() || undefined,
                deployment_date: deploymentDate || undefined,
                go_live_date: goLiveDate || undefined,
                deployment_done_by: deploymentDoneBy ? Number(deploymentDoneBy) : undefined,
                admin_login_link: adminLoginLink.trim() || undefined,
              }
            : undefined,
        credentials: credentials
          .filter((c) => c.admin_id.trim() && c.admin_password.trim())
          .map((c) => ({
            admin_label: c.admin_label.trim() || 'Admin',
            admin_id: c.admin_id.trim(),
            admin_password: c.admin_password.trim(),
          })),
      };

      const updated = await onUpdateDetails(createdProject.project_id, payload);
      setCreatedProject(updated);
      setSaveSuccessMsg('Deployment details saved successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);

      if (andGoNext) {
        setCurrentStep(3);
      }
    } catch (err: any) {
      console.error('Error updating deployment details:', err);
      setError(err?.detail || err?.message || 'Failed to save deployment details.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleSaveTechStack = async (andFinish = false) => {
    if (!createdProject || !onUpdateDetails) {
      if (andFinish) handleClose();
      return;
    }

    try {
      setIsSavingDetails(true);
      setError(null);

      const payload: Partial<CreateProjectPayload> = {
        tech_frontend: techFrontend.trim() || undefined,
        tech_backend: techBackend.trim() || undefined,
        tech_cloud: techCloud.trim() || undefined,
      };

      const updated = await onUpdateDetails(createdProject.project_id, payload);
      setCreatedProject(updated);

      if (andFinish) {
        handleClose();
      } else {
        setSaveSuccessMsg('Tech-stack details saved successfully!');
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      console.error('Error updating tech-stack details:', err);
      setError(err?.detail || err?.message || 'Failed to save tech-stack details.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleStepClick = async (step: 1 | 2 | 3) => {
    if (step === currentStep) return;
    if (!createdProject) {
      if (step > 1) {
        // Need to create basic project first
        await handleCreateInitialProject(true);
        if (step === 3) setCurrentStep(3);
      } else {
        setCurrentStep(1);
      }
    } else {
      setError(null);
      setCurrentStep(step);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setIsSubmitting(false);
    setIsSavingDetails(false);
    setCreatedProject(null);
    setSaveSuccessMsg(null);
    setError(null);
    setProjectName('');
    setProjectType('client');
    setCategory('ecom_website');
    setOtherCategory('');
    setProjectStatus('new');
    setStartDate('');
    setDeadline('');
    setProjectManagerId('');
    setSelectedMemberIds([]);
    setClientName('');
    setLeadReceivedDate('');
    setProjectApprovedDate('');
    setVercelAccount('');
    setVercelLink('');
    setDomainLink('');
    setStorageAccount('');
    setDeploymentDate('');
    setGoLiveDate('');
    setDeploymentDoneBy('');
    setAdminLoginLink('');
    setCredentials([]);
    setTechFrontend('');
    setTechBackend('');
    setTechCloud('');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA') return;

      e.preventDefault();
      if (!createdProject) {
        handleCreateInitialProject(true);
      } else if (currentStep === 1) {
        handleSaveBasicChanges();
      } else if (currentStep === 2) {
        handleSaveDeployment(true);
      } else if (currentStep === 3) {
        handleSaveTechStack(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdProject) {
      handleCreateInitialProject(true);
    } else if (currentStep === 1) {
      handleSaveBasicChanges();
    } else if (currentStep === 2) {
      handleSaveDeployment(true);
    } else if (currentStep === 3) {
      handleSaveTechStack(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                {createdProject ? createdProject.project_name : 'Create Project'}
              </h2>
              {createdProject && (
                <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                  {createdProject.project_no}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {createdProject
                ? 'Project created! Add deployment details and technology stack across sections'
                : 'Fill in basic project details to create the project card immediately'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress / Sections Navigation */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => handleStepClick(1)}
              className="flex items-center gap-2 group text-left focus:outline-none"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  createdProject
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : currentStep === 1
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm'
                    : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                }`}
              >
                {createdProject ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
              </div>
              <div>
                <span
                  className={`block text-xs font-medium transition ${
                    currentStep === 1 ? 'text-blue-600 font-bold' : 'text-slate-600 group-hover:text-slate-900'
                  }`}
                >
                  Basic Details
                </span>
                {createdProject && (
                  <span className="block text-[10px] text-emerald-600 font-medium">Created ✓</span>
                )}
              </div>
            </button>

            <div
              className={`flex-1 h-0.5 mx-3 transition-colors ${
                createdProject ? 'bg-emerald-500' : currentStep > 1 ? 'bg-blue-500' : 'bg-slate-200'
              }`}
            />

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => handleStepClick(2)}
              className="flex items-center gap-2 group text-left focus:outline-none"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  currentStep === 2
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm'
                    : createdProject
                    ? 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 border border-slate-300'
                    : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                }`}
              >
                2
              </div>
              <span
                className={`text-xs font-medium transition ${
                  currentStep === 2 ? 'text-blue-600 font-bold' : 'text-slate-600 group-hover:text-slate-900'
                }`}
              >
                Deployment Details
              </span>
            </button>

            <div
              className={`flex-1 h-0.5 mx-3 transition-colors ${
                currentStep > 2 ? 'bg-blue-500' : 'bg-slate-200'
              }`}
            />

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => handleStepClick(3)}
              className="flex items-center gap-2 group text-left focus:outline-none"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  currentStep === 3
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm'
                    : createdProject
                    ? 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 border border-slate-300'
                    : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                }`}
              >
                3
              </div>
              <span
                className={`text-xs font-medium transition ${
                  currentStep === 3 ? 'text-blue-600 font-bold' : 'text-slate-600 group-hover:text-slate-900'
                }`}
              >
                Tech-Stack Details
              </span>
            </button>
          </div>
        </div>

        {/* Created Banner Notification */}
        {createdProject && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <div>
                <p className="font-semibold text-emerald-900">
                  Project <span className="font-mono text-emerald-700">{createdProject.project_no}</span> created! Card is live on the board.
                </p>
                <p className="text-[11px] text-emerald-700">
                  You can configure deployment credentials and technology stack below, or finish anytime.
                </p>
              </div>
            </div>
            {saveSuccessMsg && (
              <span className="ml-3 px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 font-medium rounded-lg text-[11px] shadow-sm animate-pulse">
                {saveSuccessMsg}
              </span>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5">
            {/* STEP 1: BASIC DETAILS */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter project name (e.g. Website Redesign)"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Project Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value as ProjectType)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    >
                      <option value="client">Client Project (VM-CL)</option>
                      <option value="internal">Internal Project (VM-IN)</option>
                      <option value="product">Product Project (VM-PR)</option>
                      <option value="maintenance">Maintenance Project (VM-MN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    >
                      <option value="ecom_website">E-com Website</option>
                      <option value="portfolio_website">Portfolio Website</option>
                      <option value="seo">SEO</option>
                      <option value="social_media">Social Media</option>
                      <option value="crm">CRM</option>
                      <option value="erp">ERP</option>
                      <option value="brochure">Brochure</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {category === 'other' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Specify Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter custom category"
                      value={otherCategory}
                      onChange={(e) => setOtherCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Project Manager <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={projectManagerId}
                      onChange={(e) => setProjectManagerId(Number(e.target.value) || '')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    >
                      <option value="">Select Project Manager</option>
                      {employees.map((emp) => (
                        <option key={emp.emp_id} value={emp.emp_id}>
                          {emp.name} {emp.role_name ? `(${emp.role_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Initial Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={projectStatus}
                      onChange={(e) => setProjectStatus(e.target.value as ProjectStatus)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      End Date / Deadline <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Team Members Multi-selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign Team Members
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Click employees to add or remove them from this project team.
                  </p>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50/50 space-y-1">
                    {employees.map((emp) => {
                      const isSelected = selectedMemberIds.includes(emp.emp_id);
                      const isPM = projectManagerId === emp.emp_id;
                      return (
                        <div
                          key={emp.emp_id}
                          onClick={() => !isPM && toggleMember(emp.emp_id)}
                          className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition select-none ${
                            isPM
                              ? 'bg-blue-50 border border-blue-200 text-blue-800 cursor-default'
                              : isSelected
                              ? 'bg-blue-600 text-white font-medium shadow-sm'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] uppercase font-bold text-slate-700 overflow-hidden">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{emp.name}</span>
                            {emp.role_name && (
                              <span
                                className={`text-[10px] ${
                                  isSelected ? 'text-blue-100' : 'text-slate-400'
                                }`}
                              >
                                ({emp.role_name})
                              </span>
                            )}
                          </div>
                          {isPM ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                              PM
                            </span>
                          ) : isSelected ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Details (Optional - Client & Lead Info) */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 block">
                      Additional Details (Client & Approval - Optional)
                    </span>
                    <span className="text-[10px] text-slate-500">Visible to Admin & PM</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Client Name
                      </label>
                      <input
                        type="text"
                        placeholder="Client / Organization"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Lead Received Date
                      </label>
                      <input
                        type="date"
                        value={leadReceivedDate}
                        onChange={(e) => setLeadReceivedDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Approved Date
                      </label>
                      <input
                        type="date"
                        value={projectApprovedDate}
                        onChange={(e) => setProjectApprovedDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: DEPLOYMENT DETAILS */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hosting / Environment
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Production / Vercel Pro"
                      value={vercelAccount}
                      onChange={(e) => setVercelAccount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Domain / Live URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://example.com"
                      value={domainLink}
                      onChange={(e) => setDomainLink(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vercel / Deployment Project Link
                    </label>
                    <input
                      type="text"
                      placeholder="https://vercel.com/team/project"
                      value={vercelLink}
                      onChange={(e) => setVercelLink(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Storage Account / Provider
                    </label>
                    <input
                      type="text"
                      placeholder="AWS S3 / Cloudflare R2 / Supabase"
                      value={storageAccount}
                      onChange={(e) => setStorageAccount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Deployment Date
                    </label>
                    <input
                      type="date"
                      value={deploymentDate}
                      onChange={(e) => setDeploymentDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Go-Live Date
                    </label>
                    <input
                      type="date"
                      value={goLiveDate}
                      onChange={(e) => setGoLiveDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Deployment Done By
                    </label>
                    <select
                      value={deploymentDoneBy}
                      onChange={(e) => setDeploymentDoneBy(Number(e.target.value) || '')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    >
                      <option value="">Select Deployer</option>
                      {employees.map((emp) => (
                        <option key={emp.emp_id} value={emp.emp_id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admin Portal / Login Link
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com/admin/login"
                    value={adminLoginLink}
                    onChange={(e) => setAdminLoginLink(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                {/* Admin Credentials Dynamic Section */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 block">
                        Admin Login Credentials
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Securely stored and visible only to Project Manager and Admins
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCredential}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Credential
                    </button>
                  </div>

                  {credentials.length === 0 ? (
                    <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                      No admin credentials added yet. Click &ldquo;Add Credential&rdquo; if needed.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {credentials.map((cred, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                        >
                          <input
                            type="text"
                            placeholder="Label (e.g. Superadmin)"
                            value={cred.admin_label}
                            onChange={(e) =>
                              handleCredentialChange(idx, 'admin_label', e.target.value)
                            }
                            className="w-1/4 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Admin ID / Email"
                            value={cred.admin_id}
                            onChange={(e) =>
                              handleCredentialChange(idx, 'admin_id', e.target.value)
                            }
                            className="w-1/3 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="relative flex-1">
                            <input
                              type={cred.showPassword ? 'text' : 'password'}
                              placeholder="Password"
                              value={cred.admin_password}
                              onChange={(e) =>
                                handleCredentialChange(idx, 'admin_password', e.target.value)
                              }
                              className="w-full px-3 py-1.5 pr-8 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleCredentialChange(idx, 'showPassword', !cred.showPassword)
                              }
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                            >
                              {cred.showPassword ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCredential(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: TECH-STACK DETAILS */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Frontend Technology
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. React 19, Vite, TailwindCSS, TypeScript"
                    value={techFrontend}
                    onChange={(e) => setTechFrontend(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {['React', 'Next.js', 'Vue.js', 'Angular', 'Flutter', 'React Native'].map(
                      (tech) => (
                        <button
                          key={tech}
                          type="button"
                          onClick={() =>
                            setTechFrontend((prev) =>
                              prev ? (prev.includes(tech) ? prev : `${prev}, ${tech}`) : tech
                            )
                          }
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] transition"
                        >
                          +{tech}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Backend Technology
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NestJS, Node.js, Express, Python / Django"
                    value={techBackend}
                    onChange={(e) => setTechBackend(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {['NestJS', 'Node.js / Express', 'Python / FastAPI', 'Go', 'PHP / Laravel'].map(
                      (tech) => (
                        <button
                          key={tech}
                          type="button"
                          onClick={() =>
                            setTechBackend((prev) =>
                              prev ? (prev.includes(tech) ? prev : `${prev}, ${tech}`) : tech
                            )
                          }
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] transition"
                        >
                          +{tech}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Database & Cloud Platform
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PostgreSQL, Prisma ORM, Redis, Supabase, AWS"
                    value={techCloud}
                    onChange={(e) => setTechCloud(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'AWS', 'Supabase'].map((tech) => (
                      <button
                        key={tech}
                        type="button"
                        onClick={() =>
                          setTechCloud((prev) =>
                            prev ? (prev.includes(tech) ? prev : `${prev}, ${tech}`) : tech
                          )
                        }
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] transition"
                      >
                        +{tech}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Additional Notes & Requirements
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter any additional architectural details, repository URLs, or project notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            {!createdProject ? (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleCreateInitialProject(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-50 rounded-xl text-xs font-semibold transition shadow-sm"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateInitialProject(true)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create & Add Details
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
                  >
                    Done / View Card
                  </button>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => (prev === 3 ? 2 : 1))}
                      className="inline-flex items-center gap-1 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-medium transition"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Previous Section
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {currentStep === 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveBasicChanges}
                        disabled={isSavingDetails}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 rounded-xl text-xs font-semibold transition"
                      >
                        {isSavingDetails ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition"
                      >
                        Next: Deployment Details
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {currentStep === 2 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveDeployment(false)}
                        disabled={isSavingDetails}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 rounded-xl text-xs font-semibold transition"
                      >
                        {isSavingDetails ? 'Saving...' : 'Save Deployment'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveDeployment(true)}
                        disabled={isSavingDetails}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition"
                      >
                        Save & Next: Tech-Stack
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {currentStep === 3 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveTechStack(false)}
                        disabled={isSavingDetails}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 rounded-xl text-xs font-semibold transition"
                      >
                        {isSavingDetails ? 'Saving...' : 'Save Tech-Stack'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveTechStack(true)}
                        disabled={isSavingDetails}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/20 transition"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        Finish & View Card
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
