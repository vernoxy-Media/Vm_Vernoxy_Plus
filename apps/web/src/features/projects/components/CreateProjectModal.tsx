import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Check, Building2, Loader2, X } from 'lucide-react';
import type {
  AssignableEmployee,
  CreateProjectPayload,
  ProjectCategory,
  ProjectItem,
  ProjectStatus,
  ProjectType,
} from '../types';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { J_BTN_PRIMARY, J_BTN_SUBTLE, J_INPUT, JBanner, JField, JiraModal } from '@/shared/ui/JiraModal';
import { JiraAvatar } from '@/shared/ui/JiraAvatar';
import { ClientPicker } from './ClientPicker';

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
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      setErrors({});
    }
  }, [isOpen, initialData, mode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
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
    setSelectedMemberIds((prev) => (prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]));
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
    setErrors({});
    onClose();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!projectName.trim()) e.name = 'Project name is required.';
    if (!startDate) e.start = 'Start date is required.';
    if (!deadline) e.end = 'End date / deadline is required.';
    else if (startDate && new Date(startDate) > new Date(deadline)) e.end = 'The deadline cannot be before the start date.';
    if (!projectManagerId) e.manager = 'Please select a Project Manager.';
    if (category === 'other' && !otherCategory.trim()) e.other = 'Please specify the category.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    try {
      setIsSubmitting(true);

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
      setError(err?.detail || err?.message || 'Failed to save the project. Please check the inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEdit = mode === 'edit';
  const prefix = /\(([A-Z]{2}-[A-Z]{2})\)/.exec(projectTypeOptions.find((o) => o.code === projectType)?.label ?? '')?.[1];

  return (
    <JiraModal
      title={isEdit ? 'Edit project' : 'Create project'}
      size="lg"
      onClose={handleClose}
      onSubmit={handleSubmit}
      zIndex={60}
      footer={
        <>
          <button type="button" onClick={handleClose} disabled={isSubmitting} className={J_BTN_SUBTLE}>Cancel</button>
          <button type="submit" disabled={isSubmitting} className={J_BTN_PRIMARY}>
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? 'Save' : 'Create'}
          </button>
        </>
      }
    >
      <p className="text-[12px] text-[#5E6C84]">Required fields are marked with an asterisk <span className="text-[#DE350B]">*</span></p>
      {error && <JBanner>{error}</JBanner>}

      {isEdit && initialData?.project_no && (
        <JField label="Key" htmlFor="project-key">
          <input id="project-key" value={initialData.project_no} disabled className={J_INPUT} />
        </JField>
      )}

      <JField label="Project name" required htmlFor="project-name" error={errors.name}>
        <input id="project-name" autoFocus type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Website redesign" className={J_INPUT} />
      </JField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <JField label="Project type" required htmlFor="project-type" hint={!isEdit && prefix ? `Keys start with ${prefix}` : undefined}>
          <select id="project-type" value={projectType} onChange={(e) => setProjectType(e.target.value as ProjectType)} className={J_INPUT}>
            {projectTypeOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>{opt.label}</option>
            ))}
          </select>
        </JField>
        <JField label="Category" required htmlFor="project-category">
          <select id="project-category" value={category} onChange={(e) => setCategory(e.target.value as ProjectCategory)} className={J_INPUT}>
            {categoryOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>{opt.label}</option>
            ))}
          </select>
        </JField>
      </div>

      {category === 'other' && (
        <JField label="Specify category" required htmlFor="project-other" error={errors.other}>
          <input id="project-other" type="text" value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} placeholder="Enter a custom category" className={J_INPUT} />
        </JField>
      )}

      {projectType === 'client' && (
        <JField label="Client" optional htmlFor="project-client" hint="Choose from the clients you have won, or type a new name.">
          <ClientPicker id="project-client" value={clientName} onChange={setClientName} />
        </JField>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <JField label="Project lead" required htmlFor="project-manager" error={errors.manager}>
          <select id="project-manager" value={projectManagerId} onChange={(e) => setProjectManagerId(e.target.value ? Number(e.target.value) : '')} className={J_INPUT}>
            <option value="">Select a project manager</option>
            {employees.map((emp) => (
              <option key={emp.emp_id} value={emp.emp_id}>
                {emp.name}{emp.role_name ? ` (${emp.role_name})` : ''}{emp.department_name ? ` · ${emp.department_name}` : ''}
              </option>
            ))}
          </select>
        </JField>
        <JField label={isEdit ? 'Status' : 'Initial status'} required htmlFor="project-status">
          <select id="project-status" value={projectStatus} onChange={(e) => setProjectStatus(e.target.value as ProjectStatus)} className={J_INPUT}>
            <option value="new">New</option>
            <option value="planning">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
          </select>
        </JField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <JField label="Start date" required htmlFor="project-start" error={errors.start}>
          <input id="project-start" type="date" value={startDate} max={deadline || undefined} onChange={(e) => setStartDate(e.target.value)} className={J_INPUT} />
        </JField>
        <JField label="End date / deadline" required htmlFor="project-end" error={errors.end}>
          <input id="project-end" type="date" value={deadline} min={startDate || undefined} onChange={(e) => setDeadline(e.target.value)} className={J_INPUT} />
        </JField>
      </div>

      <JField label="Description" optional htmlFor="project-desc">
        <textarea id="project-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about, and what should it deliver?" className={`${J_INPUT} resize-y`} />
      </JField>

      {/* Team: chips for who is on the project, and a search to add more */}
      <div ref={memberDropdownRef}>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="project-members" className="text-[12px] font-semibold text-[#5E6C84]">Team members</label>
          <span className="text-[12px] text-[#5E6C84]">{selectedMemberIds.length} selected</span>
        </div>

        {selectedMemberIds.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {selectedMemberIds.map((id) => {
              const emp = employees.find((x) => x.emp_id === id);
              if (!emp) return null;
              return (
                <li key={id} className="inline-flex items-center gap-1.5 rounded-[3px] bg-[#DFE1E6] py-0.5 pl-1 pr-1 text-[13px] font-medium text-[#172B4D]">
                  <JiraAvatar name={emp.name} id={emp.emp_id} src={emp.profile_picture} size={18} />
                  <span>{emp.name}</span>
                  <button type="button" onClick={(e) => removeMember(id, e)} aria-label={`Remove ${emp.name}`} className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-[3px] text-[#42526E] hover:bg-[rgba(9,30,66,0.12)]">
                    <X className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E6C84]" />
          <input
            id="project-members"
            type="text"
            value={memberSearch}
            onChange={(e) => { setMemberSearch(e.target.value); setIsMemberDropdownOpen(true); }}
            onFocus={() => setIsMemberDropdownOpen(true)}
            placeholder="Search employees by name, department or role"
            autoComplete="off"
            className={`${J_INPUT} pl-8`}
          />

          {isMemberDropdownOpen && (
            <div role="listbox" aria-multiselectable className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-[3px] bg-white py-1 shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]">
              {filteredEmployees.length === 0 ? (
                <p className="px-3 py-4 text-center text-[13px] text-[#5E6C84]">No active employees match “{memberSearch}”</p>
              ) : (
                filteredEmployees.map((emp) => {
                  const on = selectedMemberIds.includes(emp.emp_id);
                  return (
                    <button
                      key={emp.emp_id}
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => toggleMember(emp.emp_id)}
                      className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#F4F5F7] ${on ? 'bg-[rgb(var(--ac-50-rgb,222_235_255)/0.6)]' : ''}`}
                    >
                      <JiraAvatar name={emp.name} id={emp.emp_id} src={emp.profile_picture} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[14px] text-[#172B4D]">
                          <span className="truncate">{emp.name}</span>
                          {emp.role_name && <span className="shrink-0 rounded-[3px] bg-[#DFE1E6] px-1 py-px text-[11px] font-semibold text-[#42526E]">{emp.role_name}</span>}
                        </span>
                        <span className="flex items-center gap-2 truncate text-[12px] text-[#5E6C84]">
                          {emp.department_name && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{emp.department_name}</span>}
                          <span className="truncate">{emp.email}</span>
                        </span>
                      </span>
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-2 ${on ? 'border-[color:var(--ac-main,#0052CC)] bg-[color:var(--ac-main,#0052CC)] text-white' : 'border-[#DFE1E6] bg-white'}`}>
                        {on && <Check className="h-3 w-3" strokeWidth={3.5} />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </JiraModal>
  );
};
