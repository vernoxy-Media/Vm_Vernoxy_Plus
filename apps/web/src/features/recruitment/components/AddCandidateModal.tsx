import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Briefcase,
  FileText,
  Upload,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Building2,
  Check,
} from 'lucide-react';
import {
  useNextCandidateCodeQuery,
  useCheckDuplicateCandidateMutation,
  useUploadCandidateResumeMutation,
  useCreateCandidateMutation,
  useUpdateCandidateMutation,
  type DuplicateMatch,
} from '../hooks/use-recruitment';
import {
  useRoleOptionsQuery,
  useDepartmentOptionsQuery,
  useEmployeeOptionsQuery,
} from '@/features/organization/hooks/use-organization';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { CountryPhoneInput, SearchableSelect } from '@/shared/ui';

interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  candidateToEdit?: any | null;
}

export const AddCandidateModal: React.FC<AddCandidateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  candidateToEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'experience' | 'source'>('info');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [createdCandidate, setCreatedCandidate] = useState<{
    candidate_id: number;
    candidate_code: string;
    name: string;
  } | null>(null);

  // Queries
  const { data: nextCodeData } = useNextCandidateCodeQuery();
  const [selectedDepId, setSelectedDepId] = useState<number | undefined>(undefined);
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(undefined);

  const { data: departments = [] } = useDepartmentOptionsQuery();
  const { data: roles = [] } = useRoleOptionsQuery(selectedDepId);
  const { data: employees = [] } = useEmployeeOptionsQuery();

  const { data: genders = [] } = useLookupsQuery('gender');
  const { data: sources = [] } = useLookupsQuery('candidate_source');
  const { data: portals = [] } = useLookupsQuery('job_portal');
  const { data: noticePeriods = [] } = useLookupsQuery('notice_period');
  const { data: stages = [] } = useLookupsQuery('candidate_stage');

  // Mutations
  const checkDuplicateMutation = useCheckDuplicateCandidateMutation();
  const uploadResumeMutation = useUploadCandidateResumeMutation();
  const createCandidateMutation = useCreateCandidateMutation();
  const updateCandidateMutation = useUpdateCandidateMutation();

  // Form State - Candidate Info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [email, setEmail] = useState('');
  const [genderId, setGenderId] = useState<number | undefined>(undefined);
  const [currentLocation, setCurrentLocation] = useState('');

  // Resume State
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeFilename, setResumeFilename] = useState('');
  const [resumeSize, setResumeSize] = useState<number | undefined>(undefined);
  const [resumeMime, setResumeMime] = useState('');
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State - Role & Experience
  const [stage, setStage] = useState('open');
  const [experienceType, setExperienceType] = useState<'fresher' | 'experienced'>('experienced');
  const [expYears, setExpYears] = useState(0);
  const [expMonths, setExpMonths] = useState(0);
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentDesignation, setCurrentDesignation] = useState('');
  const [currentCtc, setCurrentCtc] = useState<string>('');
  const [expectedCtc, setExpectedCtc] = useState<string>('');
  const [noticePeriod, setNoticePeriod] = useState('30_days');
  const [servingNoticeLwd, setServingNoticeLwd] = useState('');

  // Key Skills State
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  // Form State - Source
  const [source, setSource] = useState('job_portal');
  const [sourcePortal, setSourcePortal] = useState('naukri');
  const [referredByEmpId, setReferredByEmpId] = useState<number | undefined>(undefined);
  const [consultancyName, setConsultancyName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [sourceDetails, setSourceDetails] = useState('');
  const [notes, setNotes] = useState('');

  // Duplicates & Validation
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prefill state when editing existing candidate
  useEffect(() => {
    if (isOpen && candidateToEdit) {
      setName(candidateToEdit.name || '');
      setPhone(candidateToEdit.phone ? String(candidateToEdit.phone).replace(/\D/g, '').slice(-10) : '');
      setEmail(candidateToEdit.email || '');
      setGenderId(candidateToEdit.gender_id ?? candidateToEdit.genderId ?? undefined);
      setCurrentLocation(candidateToEdit.current_location || candidateToEdit.currentLocation || '');
      setResumeUrl(candidateToEdit.resume_url || candidateToEdit.resumeUrl || '');
      setResumeFilename(candidateToEdit.resume_filename || candidateToEdit.resumeFilename || '');
      setResumeSize(candidateToEdit.resume_size ?? candidateToEdit.resumeSize ?? undefined);
      setResumeMime(candidateToEdit.resume_mime || candidateToEdit.resumeMime || '');
      setSelectedDepId(candidateToEdit.dep_id ?? candidateToEdit.depId ?? undefined);
      setSelectedRoleId(candidateToEdit.role_id ?? candidateToEdit.roleId ?? undefined);
      setStage(candidateToEdit.stage || 'open');
      setExperienceType(candidateToEdit.experience_type || candidateToEdit.experienceType || 'experienced');
      setExpYears(candidateToEdit.exp_years ?? candidateToEdit.expYears ?? 0);
      setExpMonths(candidateToEdit.exp_months ?? candidateToEdit.expMonths ?? 0);
      setCurrentCompany(candidateToEdit.current_company || candidateToEdit.currentCompany || '');
      setCurrentDesignation(candidateToEdit.current_designation || candidateToEdit.currentDesignation || '');
      setCurrentCtc(candidateToEdit.current_ctc ? String(candidateToEdit.current_ctc) : candidateToEdit.currentCtc ? String(candidateToEdit.currentCtc) : '');
      setExpectedCtc(candidateToEdit.expected_ctc ? String(candidateToEdit.expected_ctc) : candidateToEdit.expectedCtc ? String(candidateToEdit.expectedCtc) : '');
      setNoticePeriod(candidateToEdit.notice_period || candidateToEdit.noticePeriod || '30_days');
      setServingNoticeLwd(candidateToEdit.serving_notice_lwd ? String(candidateToEdit.serving_notice_lwd).slice(0, 10) : candidateToEdit.servingNoticeLwd ? String(candidateToEdit.servingNoticeLwd).slice(0, 10) : '');
      setSkills(Array.isArray(candidateToEdit.key_skills) ? candidateToEdit.key_skills : Array.isArray(candidateToEdit.keySkills) ? candidateToEdit.keySkills : []);
      setSource(candidateToEdit.source || 'job_portal');
      setSourcePortal(candidateToEdit.source_portal || candidateToEdit.sourcePortal || 'naukri');
      setReferredByEmpId(candidateToEdit.referred_by_emp_id ?? candidateToEdit.referredByEmpId ?? undefined);
      setConsultancyName(candidateToEdit.consultancy_name || candidateToEdit.consultancyName || '');
      setCollegeName(candidateToEdit.college_name || candidateToEdit.collegeName || '');
      setSourceDetails(candidateToEdit.source_details || candidateToEdit.sourceDetails || '');
      setNotes(candidateToEdit.notes || '');
      setActiveTab('info');
      setGlobalError(null);
      setErrors({});
    } else if (isOpen && !candidateToEdit) {
      resetForm();
    }
  }, [isOpen, candidateToEdit]);

  // Handle Department Change: sets department and filters roles
  const handleDepartmentChange = (depIdVal: any) => {
    const depId = depIdVal ? Number(depIdVal) : undefined;
    setSelectedDepId(depId);

    // If current selected role doesn't match new department, clear it
    if (selectedRoleId && depId) {
      const matchedRole = roles.find((r: any) => r.role_id === selectedRoleId);
      if (matchedRole?.dep_id && matchedRole.dep_id !== depId) {
        setSelectedRoleId(undefined);
      }
    }

    setErrors((prev) => {
      const rest = { ...prev };
      delete rest.department;
      return rest;
    });
  };

  // Handle Role (Designation) Change: sets role and auto-fills department if not set
  const handleRoleChange = (roleIdVal: any) => {
    const roleId = roleIdVal ? Number(roleIdVal) : undefined;
    setSelectedRoleId(roleId);

    if (roleId) {
      const matchedRole = roles.find((r: any) => r.role_id === roleId);
      if (matchedRole?.dep_id && !selectedDepId) {
        setSelectedDepId(matchedRole.dep_id);
      }
      setErrors((prev) => {
        const rest = { ...prev };
        delete rest.role;
        return rest;
      });
    }
  };

  // Debounced Duplicate Check
  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    if (cleanPhone.length === 10 || isValidEmail) {
      const timer = setTimeout(() => {
        checkDuplicateMutation.mutate(
          {
            phone: cleanPhone.length === 10 ? cleanPhone : undefined,
            email: isValidEmail ? email.trim() : undefined,
          },
          {
            onSuccess: (matches) => {
              const currentId = candidateToEdit?.candidate_id ?? candidateToEdit?.candidateId;
              const filteredMatches = (matches || []).filter((m: any) => m.candidate_id !== currentId);
              setDuplicates(filteredMatches);
            },
            onError: () => {
              setDuplicates([]);
            },
          },
        );
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setDuplicates([]);
    }
  }, [phone, email, candidateToEdit]);

  // Skill Chip Handlers
  const handleAddSkill = (val: string) => {
    const trimmed = val.trim().replace(/^,+|,+$/g, '');
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddSkill(skillInput);
    }
  };

  // File Upload Handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, resume: 'Resume must be less than 5 MB.' }));
      return;
    }

    setIsUploadingResume(true);
    setErrors((prev) => {
      const rest = { ...prev };
      delete rest.resume;
      return rest;
    });

    uploadResumeMutation.mutate(file, {
      onSuccess: (data) => {
        setResumeUrl(data.resume_url);
        setResumeFilename(data.resume_filename);
        setResumeSize(data.resume_size);
        setResumeMime(data.resume_mime);
        setIsUploadingResume(false);
      },
      onError: (err: any) => {
        setErrors((prev) => ({
          ...prev,
          resume: err?.detail || err?.message || 'Upload failed. Please check the file and try again.',
        }));
        setIsUploadingResume(false);
      },
    });
  };

  const handleRemoveResume = () => {
    setResumeUrl('');
    setResumeFilename('');
    setResumeSize(undefined);
    setResumeMime('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validation
  const validateInfoTab = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Please enter candidate full name.';
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      errs.phone = 'The phone number must be 10 digits.';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    setErrors((prev) => {
      const next = { ...prev };
      if (errs.name) next.name = errs.name; else delete next.name;
      if (errs.phone) next.phone = errs.phone; else delete next.phone;
      if (errs.email) next.email = errs.email; else delete next.email;
      return next;
    });

    return !errs.name && !errs.phone && !errs.email;
  };

  const validateExperienceTab = () => {
    const errs: Record<string, string> = {};
    if (!selectedRoleId) errs.role = 'Please select a position applied for.';
    if (!selectedDepId) errs.department = 'Please select a department.';

    if (experienceType === 'experienced') {
      if (noticePeriod === 'serving_notice' && !servingNoticeLwd) {
        errs.servingNoticeLwd = 'Please specify the last working day.';
      }
    }

    setErrors((prev) => {
      const next = { ...prev };
      if (errs.role) next.role = errs.role; else delete next.role;
      if (errs.department) next.department = errs.department; else delete next.department;
      if (errs.servingNoticeLwd) next.servingNoticeLwd = errs.servingNoticeLwd; else delete next.servingNoticeLwd;
      return next;
    });

    return !errs.role && !errs.department && !errs.servingNoticeLwd;
  };

  const handleContinue = () => {
    if (activeTab === 'info') {
      if (validateInfoTab()) {
        setActiveTab('experience');
      }
    } else if (activeTab === 'experience') {
      if (validateExperienceTab()) {
        setActiveTab('source');
      }
    }
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Please enter candidate full name.';
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      errs.phone = 'The phone number must be 10 digits.';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!selectedRoleId) errs.role = 'Please select a position applied for.';
    if (!selectedDepId) errs.department = 'Please select a department.';

    if (experienceType === 'experienced') {
      if (noticePeriod === 'serving_notice' && !servingNoticeLwd) {
        errs.servingNoticeLwd = 'Please specify the last working day.';
      }
    }

    if (source === 'job_portal' && !sourcePortal) {
      errs.sourcePortal = 'Please select a job portal.';
    }
    if (source === 'employee_referral' && !referredByEmpId) {
      errs.referredBy = 'Please select referring employee.';
    }
    if (source === 'consultancy' && !consultancyName.trim()) {
      errs.consultancy = 'Please enter consultancy name.';
    }
    if (source === 'campus' && !collegeName.trim()) {
      errs.college = 'Please enter college name.';
    }
    if (source === 'other' && !sourceDetails.trim()) {
      errs.sourceDetails = 'Please provide source details.';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      if (errs.name || errs.phone || errs.email) {
        setActiveTab('info');
      } else if (errs.role || errs.department || errs.servingNoticeLwd) {
        setActiveTab('experience');
      } else {
        setActiveTab('source');
      }
    }
    return Object.keys(errs).length === 0;
  };

  // Reset Form
  const resetForm = () => {
    setName('');
    setPhone('');
    setCountryCode('+91');
    setEmail('');
    setGenderId(undefined);
    setCurrentLocation('');
    setResumeUrl('');
    setResumeFilename('');
    setResumeSize(undefined);
    setResumeMime('');
    setSelectedRoleId(undefined);
    setSelectedDepId(undefined);
    setStage('open');
    setExperienceType('experienced');
    setExpYears(0);
    setExpMonths(0);
    setCurrentCompany('');
    setCurrentDesignation('');
    setCurrentCtc('');
    setExpectedCtc('');
    setNoticePeriod('30_days');
    setServingNoticeLwd('');
    setSkills([]);
    setSkillInput('');
    setSource('job_portal');
    setSourcePortal('naukri');
    setReferredByEmpId(undefined);
    setConsultancyName('');
    setCollegeName('');
    setSourceDetails('');
    setNotes('');
    setDuplicates([]);
    setErrors({});
    setGlobalError(null);
    setCreatedCandidate(null);
    setActiveTab('info');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Final Candidate Creation Handler (Strictly executed ONLY from Tab 3: Source & Notes)
  const handleFinalSubmit = () => {
    if (activeTab !== 'source') {
      return;
    }
    if (!validateForm()) return;

    setGlobalError(null);
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const payload = {
      name: name.trim(),
      phone: cleanPhone,
      email: email.trim().toLowerCase(),
      gender_id: genderId,
      current_location: currentLocation.trim() || undefined,
      resume_url: resumeUrl || undefined,
      resume_filename: resumeFilename || undefined,
      resume_size: resumeSize,
      resume_mime: resumeMime || undefined,
      role_id: selectedRoleId!,
      dep_id: selectedDepId!,
      stage: stage || 'open',
      experience_type: experienceType,
      exp_years: experienceType === 'fresher' ? 0 : expYears,
      exp_months: experienceType === 'fresher' ? 0 : expMonths,
      current_company: experienceType === 'fresher' ? undefined : currentCompany.trim() || undefined,
      current_designation: experienceType === 'fresher' ? undefined : currentDesignation.trim() || undefined,
      current_ctc: experienceType === 'fresher' || !currentCtc ? undefined : Number(currentCtc),
      expected_ctc: expectedCtc ? Number(expectedCtc) : undefined,
      notice_period: experienceType === 'fresher' ? undefined : noticePeriod,
      serving_notice_lwd:
        experienceType === 'fresher' || noticePeriod !== 'serving_notice'
          ? undefined
          : servingNoticeLwd || undefined,
      key_skills: skills,
      source,
      source_portal: source === 'job_portal' ? sourcePortal : undefined,
      referred_by_emp_id: source === 'employee_referral' ? referredByEmpId : undefined,
      consultancy_name: source === 'consultancy' ? consultancyName.trim() : undefined,
      college_name: source === 'campus' ? collegeName.trim() : undefined,
      source_details: source === 'other' ? sourceDetails.trim() : undefined,
      notes: notes.trim() || undefined,
    };

    if (candidateToEdit) {
      const cid = candidateToEdit.candidate_id ?? candidateToEdit.candidateId;
      updateCandidateMutation.mutate(
        { candidateId: cid, data: payload },
        {
          onSuccess: () => {
            if (onSuccess) onSuccess();
            handleClose();
          },
          onError: (err: any) => {
            setGlobalError(err?.detail || err?.message || 'Failed to update candidate. Please try again.');
          },
        },
      );
      return;
    }

    createCandidateMutation.mutate(
      payload,
      {
        onSuccess: (res) => {
          setCreatedCandidate({
            candidate_id: res.candidate_id,
            candidate_code: res.candidate_code || 'CAN-XXXX',
            name: res.name || name.trim(),
          });
          if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
          setGlobalError(err?.detail || err?.message || 'Failed to create candidate. Please try again.');
        },
      },
    );
  };

  if (!isOpen) return null;

  // Success view
  if (createdCandidate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col space-y-4">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Candidate Added Successfully!</h3>
            <p className="text-xs text-slate-500">
              Candidate profile created for <span className="font-semibold text-slate-800">{createdCandidate.name}</span> with reference code:
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
            <span className="text-xs text-slate-500 font-medium">Candidate Reference Code:</span>
            <div className="text-lg font-mono font-bold text-blue-600 tracking-wider">
              {createdCandidate.candidate_code}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Add Another Candidate
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl h-[660px] max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header matching CreateProjectModal layout */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900">
                {candidateToEdit ? 'Edit Candidate' : 'Add Candidate'}
              </h2>
              {(candidateToEdit?.candidate_code || nextCodeData?.candidate_code) && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {candidateToEdit?.candidate_code || nextCodeData?.candidate_code}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {candidateToEdit
                ? 'Update candidate details and recruitment record'
                : 'Fill in candidate details to add them to your recruitment pipeline'}
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

        {/* Tab Navigation (Pill design matching AddEmployeeModal) */}
        <div className="px-7 pt-3.5 pb-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'info'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Candidate Info</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (validateInfoTab()) {
                setActiveTab('experience');
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'experience'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Position & Experience</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (validateInfoTab() && validateExperienceTab()) {
                setActiveTab('source');
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'source'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Source & Notes</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLElement;
              if (target.tagName === 'TEXTAREA') return;
              if (target.tagName === 'INPUT' && (target as HTMLInputElement).placeholder?.toLowerCase().includes('skill')) {
                return;
              }
              e.preventDefault();
            }
          }}
          className="flex-1 overflow-y-auto p-7 space-y-5 custom-scrollbar"
        >
          {globalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-600 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          {/* Duplicate Alert Banner */}
          {duplicates.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 space-y-1">
                <span className="font-bold">Possible duplicate candidate detected:</span>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {duplicates.map((d) => (
                    <span
                      key={`${d.type}-${d.id}`}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-amber-300 rounded-md text-[11px] font-medium"
                    >
                      <span>{d.name} ({d.code})</span>
                      <span className="text-amber-600 font-semibold uppercase text-[10px]">
                        [{d.type}{d.stage ? ` • ${d.stage}` : ''}]
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: CANDIDATE INFO */}
          {activeTab === 'info' && (
            <div className="space-y-4.5 animate-in fade-in duration-150">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Enter candidate full name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                {errors.name && <p className="text-[11px] text-red-500 font-medium">{errors.name}</p>}
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="candidate@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {errors.email && <p className="text-[11px] text-red-500 font-medium">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">10 digits</span>
                  </div>
                  <CountryPhoneInput
                    value={phone}
                    countryCode={countryCode}
                    onCountryCodeChange={setCountryCode}
                    onChange={(val) => {
                      setPhone(val);
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                    }}
                    placeholder="9876543210"
                    error={errors.phone}
                  />
                </div>
              </div>

              {/* Gender & Current Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Gender</label>
                  <select
                    value={genderId ?? ''}
                    onChange={(e) => setGenderId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="">Select Gender</option>
                    {genders.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Current Location / City</label>
                  <input
                    type="text"
                    value={currentLocation}
                    onChange={(e) => setCurrentLocation(e.target.value)}
                    placeholder="e.g. Surat, Gujarat"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Resume Upload */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Resume / CV Document</label>
                  <span className="text-[11px] text-slate-400">PDF, DOC, DOCX up to 5MB</span>
                </div>

                {resumeFilename ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800 line-clamp-1">{resumeFilename}</p>
                        {resumeSize && (
                          <p className="text-[10px] text-slate-500">{(resumeSize / 1024).toFixed(0)} KB</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveResume}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      {isUploadingResume ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Click to upload resume</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Supports PDF, DOC, DOCX up to 5MB</p>
                    </div>
                  </div>
                )}
                {errors.resume && <p className="text-[11px] text-red-500 font-medium">{errors.resume}</p>}
              </div>
            </div>
          )}

          {/* TAB 2: POSITION & EXPERIENCE */}
          {activeTab === 'experience' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Department & Position (Swapped: Department First, Designation Second) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={departments.map((d: any) => ({
                      value: d.dep_id,
                      label: d.name || (d as any).dep_name,
                    }))}
                    value={selectedDepId}
                    onChange={(val) => handleDepartmentChange(val)}
                    placeholder="Select Department"
                    searchPlaceholder="Search departments..."
                    error={errors.department}
                  />
                  {errors.department && <p className="text-[11px] text-red-500 font-medium">{errors.department}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Position Applied For <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={roles.map((r: any) => ({
                      value: r.role_id,
                      label: r.role_name || r.name,
                    }))}
                    value={selectedRoleId}
                    onChange={(val) => handleRoleChange(val)}
                    placeholder={selectedDepId ? 'Select Position / Designation' : 'Select Department first or choose Position'}
                    searchPlaceholder="Search position..."
                    error={errors.role}
                  />
                  {errors.role && <p className="text-[11px] text-red-500 font-medium">{errors.role}</p>}
                </div>
              </div>

              {/* Experience Type Toggle */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Experience Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExperienceType('fresher')}
                    className={`py-2 px-3 rounded-xl border text-[13px] font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                      experienceType === 'fresher'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {experienceType === 'fresher' && <Check className="w-3.5 h-3.5" />}
                    <span>Fresher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExperienceType('experienced')}
                    className={`py-2 px-3 rounded-xl border text-[13px] font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                      experienceType === 'experienced'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {experienceType === 'experienced' && <Check className="w-3.5 h-3.5" />}
                    <span>Experienced</span>
                  </button>
                </div>
              </div>

              {/* Experience Details (Only for experienced) */}
              {experienceType === 'experienced' && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Current / Previous Company</label>
                      <input
                        type="text"
                        value={currentCompany}
                        onChange={(e) => setCurrentCompany(e.target.value)}
                        placeholder="e.g. Acme Technologies"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Current Designation</label>
                      <input
                        type="text"
                        value={currentDesignation}
                        onChange={(e) => setCurrentDesignation(e.target.value)}
                        placeholder="e.g. Senior Frontend Developer"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  {/* Total Experience: Years & Months */}
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Experience (Years)</label>
                      <input
                        type="number"
                        min={0}
                        max={40}
                        value={expYears}
                        onChange={(e) => setExpYears(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Experience (Months)</label>
                      <input
                        type="number"
                        min={0}
                        max={11}
                        value={expMonths}
                        onChange={(e) => setExpMonths(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  {/* CTCs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Current CTC (₹ / annum)</label>
                      <input
                        type="number"
                        min={0}
                        value={currentCtc}
                        onChange={(e) => setCurrentCtc(e.target.value)}
                        placeholder="e.g. 600000"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Expected CTC (₹ / annum)</label>
                      <input
                        type="number"
                        min={0}
                        value={expectedCtc}
                        onChange={(e) => setExpectedCtc(e.target.value)}
                        placeholder="e.g. 850000"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  {/* Notice Period */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Notice Period</label>
                      <select
                        value={noticePeriod}
                        onChange={(e) => setNoticePeriod(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                      >
                        {noticePeriods.map((np) => (
                          <option key={np.id} value={np.code}>
                            {np.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {noticePeriod === 'serving_notice' && (
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                          Last Working Day (LWD) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={servingNoticeLwd}
                          onChange={(e) => setServingNoticeLwd(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                        {errors.servingNoticeLwd && (
                          <p className="text-[11px] text-red-500 font-medium">{errors.servingNoticeLwd}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Expected CTC for fresher */}
              {experienceType === 'fresher' && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Expected CTC (₹ / annum)</label>
                  <input
                    type="number"
                    min={0}
                    value={expectedCtc}
                    onChange={(e) => setExpectedCtc(e.target.value)}
                    placeholder="e.g. 350000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              )}

              {/* Key Skills */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Key Skills</label>
                  <span className="text-[11px] text-slate-400">Press Enter or comma to add</span>
                </div>
                <div className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-1.5 items-center min-h-[42px]">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    placeholder={skills.length === 0 ? 'Type skill and press Enter (e.g. React, Node.js)' : 'Add skill...'}
                    className="flex-1 min-w-[140px] bg-transparent text-[13.5px] focus:outline-hidden px-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SOURCE & NOTES */}
          {activeTab === 'source' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Candidate Source */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                  Candidate Source <span className="text-red-500">*</span>
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.code}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional Source Inputs */}
              {source === 'job_portal' && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Job Portal <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={sourcePortal}
                    onChange={(e) => setSourcePortal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    {portals.map((p) => (
                      <option key={p.id} value={p.code}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  {errors.sourcePortal && <p className="text-[11px] text-red-500 font-medium">{errors.sourcePortal}</p>}
                </div>
              )}

              {source === 'employee_referral' && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Referring Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={referredByEmpId ?? ''}
                    onChange={(e) => setReferredByEmpId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.emp_id} value={emp.emp_id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))}
                  </select>
                  {errors.referredBy && <p className="text-[11px] text-red-500 font-medium">{errors.referredBy}</p>}
                </div>
              )}

              {source === 'consultancy' && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Consultancy Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={consultancyName}
                    onChange={(e) => setConsultancyName(e.target.value)}
                    placeholder="Enter consultancy name"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {errors.consultancy && <p className="text-[11px] text-red-500 font-medium">{errors.consultancy}</p>}
                </div>
              )}

              {source === 'campus' && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    College / University Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="Enter college or university name"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {errors.college && <p className="text-[11px] text-red-500 font-medium">{errors.college}</p>}
                </div>
              )}

              {source === 'other' && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Source Details <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sourceDetails}
                    onChange={(e) => setSourceDetails(e.target.value)}
                    placeholder="Describe how the candidate was sourced"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {errors.sourceDetails && <p className="text-[11px] text-red-500 font-medium">{errors.sourceDetails}</p>}
                </div>
              )}

              {/* Initial Stage */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Initial Pipeline Stage</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                >
                  {!stages.some((st) => st.code.toLowerCase() === 'open') && (
                    <option value="open">Open</option>
                  )}
                  {stages.map((st) => (
                    <option key={st.id} value={st.code}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Internal Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Internal Notes & Remarks</label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any initial interviewer notes, screening impressions, or references..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-y"
                />
              </div>
            </div>
          )}

          {/* Modal Footer matching CreateProjectModal */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              disabled={createCandidateMutation.isPending}
              className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {activeTab !== 'info' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'source') setActiveTab('experience');
                    else if (activeTab === 'experience') setActiveTab('info');
                  }}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Previous
                </button>
              )}

              {activeTab !== 'source' ? (
                <button
                  key="btn-modal-continue"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleContinue();
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Continue
                </button>
              ) : (
                <button
                  key="btn-modal-submit"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFinalSubmit();
                  }}
                  disabled={createCandidateMutation.isPending || updateCandidateMutation.isPending}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {(createCandidateMutation.isPending || updateCandidateMutation.isPending) ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{candidateToEdit ? 'Saving Changes...' : 'Adding Candidate...'}</span>
                    </>
                  ) : (
                    <span>{candidateToEdit ? 'Save Changes' : 'Add Candidate'}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
