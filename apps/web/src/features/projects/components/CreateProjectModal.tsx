import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  Users,
  Building2,
  AlertCircle,
} from 'lucide-react';
import type {
  AssignableEmployee,
  CreateProjectPayload,
  ProjectCategory,
  ProjectItem,
  ProjectStatus,
  ProjectType,
} from '../types';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';

const DEFAULT_PROJECT_TYPES = [
  { code: 'client', label: 'Client Project (VM-CL)' },
  { code: 'internal', label: 'Internal Project (VM-IN)' },
  { code: 'product', label: 'Product Project (VM-PR)' },
  { code: 'maintenance', label: 'Maintenance Project (VM-MN)' },
];

const DEFAULT_CATEGORIES = [
  { code: 'ecom_website', label: 'E-com Website' },
  { code: 'portfolio_website', label: 'Portfolio Website' },
  { code: 'seo', label: 'SEO' },
  { code: 'social_media', label: 'Social Media' },
  { code: 'crm', label: 'CRM' },
  { code: 'erp', label: 'ERP' },
  { code: 'brochure', label: 'Brochure' },
  { code: 'other', label: 'Other' },
];

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateProjectPayload) => Promise<ProjectItem | void>;
  employees: AssignableEmployee[];
  initialData?: ProjectItem | null;
  mode?: 'create' | 'edit';
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  employees,
  initialData,
  mode = 'create',
}) => {
  const { data: projectTypeLookups = [] } = useLookupsQuery('project_type');
  const { data: categoryLookups = [] } = useLookupsQuery('project_category');

  const projectTypeOptions = projectTypeLookups.length > 0
    ? projectTypeLookups.map((l) => ({ code: l.code, label: l.label }))
    : DEFAULT_PROJECT_TYPES;

  const categoryOptions = categoryLookups.length > 0
    ? categoryLookups.map((l) => ({ code: l.code, label: l.label }))
    : DEFAULT_CATEGORIES;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('client');
  const [category, setCategory] = useState<ProjectCategory>('ecom_website');
  const [otherCategory, setOtherCategory] = useState('');
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('new');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [projectManagerId, setProjectManagerId] = useState<number | ''>('');
  const [clientName, setClientName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  // Team Member Dropdown & Search
  const [memberSearch, setMemberSearch] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  // Populate form fields based on mode & initialData
  useEffect(() => {
    if (isOpen) {
      if (initialData && mode === 'edit') {
        setProjectName(initialData.project_name || '');
        setDescription(initialData.description || '');
        setProjectType(initialData.project_type || 'client');
        setCategory(initialData.category || 'ecom_website');
        setOtherCategory(initialData.other_category || '');
        setProjectStatus(initialData.project_status || 'new');
        setStartDate(initialData.start_date ? initialData.start_date.slice(0, 10) : '');
        setDeadline(initialData.deadline ? initialData.deadline.slice(0, 10) : '');
        setProjectManagerId(initialData.project_manager_id || '');
        setClientName(initialData.client_name || '');
        setSelectedMemberIds(initialData.members?.map((m) => m.employee_id) || []);
      } else {
        setProjectName('');
        setDescription('');
        setProjectType('client');
        setCategory('ecom_website');
        setOtherCategory('');
        setProjectStatus('new');
        setStartDate('');
        setDeadline('');
        setProjectManagerId('');
        setClientName('');
        setSelectedMemberIds([]);
      }
      setMemberSearch('');
      setIsMemberDropdownOpen(false);
      setError(null);
    }
  }, [isOpen, initialData, mode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMemberDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const nameMatch = emp.name?.toLowerCase().includes(q);
      const emailMatch = emp.email?.toLowerCase().includes(q);
      const roleMatch = emp.role_name?.toLowerCase().includes(q);
      const deptMatch = emp.department_name?.toLowerCase().includes(q);
      return nameMatch || emailMatch || roleMatch || deptMatch;
    });
  }, [employees, memberSearch]);

  const toggleMember = (empId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const removeMember = (empId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMemberIds((prev) => prev.filter((id) => id !== empId));
  };

  const handleClose = () => {
    setProjectName('');
    setDescription('');
    setProjectType('client');
    setCategory('ecom_website');
    setOtherCategory('');
    setProjectStatus('new');
    setStartDate('');
    setDeadline('');
    setProjectManagerId('');
    setClientName('');
    setSelectedMemberIds([]);
    setMemberSearch('');
    setIsMemberDropdownOpen(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }
    if (!startDate) {
      setError('Start date is required');
      return;
    }
    if (!deadline) {
      setError('End date / deadline is required');
      return;
    }
    if (new Date(startDate) > new Date(deadline)) {
      setError('Deadline cannot be before start date');
      return;
    }
    if (!projectManagerId) {
      setError('Please select a Project Manager');
      return;
    }
    if (category === 'other' && !otherCategory.trim()) {
      setError('Please specify the category');
      return;
    }

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
        description: description.trim() || undefined,
      };

      await onSubmit(payload);
      handleClose();
    } catch (err: any) {
      console.error('Error creating project:', err);
      const msg = err?.detail || err?.message || 'Failed to create project. Please check the inputs.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === 'edit' ? 'Edit Project Details' : 'Create Project'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'edit'
                ? 'Update project information and manage team member assignments'
                : 'Fill in project details to create the project card immediately'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-600 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name (e.g. Website Redesign)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Description Field (Accepts large paragraphs) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Project Description</label>
              <span className="text-[11px] text-slate-400">Optional</span>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed overview of the project scope, objectives, or deliverable details..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-y"
            />
          </div>

          {/* Row: Project Type & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Project Type <span className="text-red-500">*</span>
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as ProjectType)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                {projectTypeOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {category === 'other' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Specify Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={otherCategory}
                onChange={(e) => setOtherCategory(e.target.value)}
                placeholder="Enter custom category"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          )}

          {/* Row: Project Manager & Initial Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Project Manager <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={projectManagerId}
                onChange={(e) => setProjectManagerId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                <option value="">Select Project Manager</option>
                {employees.map((emp) => (
                  <option key={emp.emp_id} value={emp.emp_id}>
                    {emp.name} {emp.role_name ? `(${emp.role_name})` : ''} {emp.department_name ? `• ${emp.department_name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Initial Status <span className="text-red-500">*</span>
              </label>
              <select
                value={projectStatus}
                onChange={(e) => setProjectStatus(e.target.value as ProjectStatus)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                <option value="new">New</option>
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>

          {/* Row: Start Date & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Start Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                End Date / Deadline <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Client Name (Optional) */}
          {projectType === 'client' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Client / Company Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client or brand name (e.g. Acme Corp)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          )}

          {/* Assign Team Members with Searchable Dropdown (Filter by Name, Department, Role) */}
          <div className="space-y-2 pt-1" ref={memberDropdownRef}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Assign Team Members</label>
              <span className="text-[11px] font-semibold text-slate-400">
                {selectedMemberIds.length} selected
              </span>
            </div>

            {/* Selected Member Chips */}
            {selectedMemberIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {selectedMemberIds.map((id) => {
                  const emp = employees.find((e) => e.emp_id === id);
                  if (!emp) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium"
                    >
                      <span>{emp.name}</span>
                      {emp.role_name && (
                        <span className="text-[10px] text-blue-500">({emp.role_name})</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => removeMember(id, e)}
                        className="text-blue-400 hover:text-blue-700 rounded-full p-0.5 hover:bg-blue-100 transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Dropdown Container */}
            <div className="relative">
              <div
                onClick={() => setIsMemberDropdownOpen(true)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition"
              >
                <div className="flex items-center gap-2 text-slate-400 flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setIsMemberDropdownOpen(true);
                    }}
                    onFocus={() => setIsMemberDropdownOpen(true)}
                    placeholder="Search active employees by name, department, or role..."
                    className="bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400 w-full"
                  />
                </div>
                <Users className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </div>

              {/* Dropdown Menu */}
              {isMemberDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No active employees found matching &quot;{memberSearch}&quot;
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isSelected = selectedMemberIds.includes(emp.emp_id);
                      return (
                        <div
                          key={emp.emp_id}
                          onClick={() => toggleMember(emp.emp_id)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition ${
                            isSelected ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <span>{emp.name}</span>
                                {emp.role_name && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-[10px] text-slate-600 font-medium border border-slate-200">
                                    {emp.role_name}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                {emp.department_name && (
                                  <span className="flex items-center gap-1 text-slate-500">
                                    <Building2 className="w-2.5 h-2.5 text-slate-400" />
                                    {emp.department_name}
                                  </span>
                                )}
                                <span>{emp.email}</span>
                              </div>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer: Cancel & Create Project */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{mode === 'edit' ? 'Saving Changes...' : 'Creating Project...'}</span>
                </>
              ) : (
                <span>{mode === 'edit' ? 'Save Changes' : 'Create Project'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
