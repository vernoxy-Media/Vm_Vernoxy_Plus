import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Upload,
  FileText,
  X,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Building2,
  Briefcase,
  User,
  MapPin,
  Workflow,
} from 'lucide-react';
import { AdminLayout } from '../../../components/AdminLayout';
import {
  useNextCandidateCodeQuery,
  useCheckDuplicateCandidateMutation,
  useUploadCandidateResumeMutation,
  useCreateCandidateMutation,
  DuplicateMatch,
} from '../../../hooks/use-recruitment';
import {
  useRoleOptionsQuery,
  useDepartmentOptionsQuery,
  useEmployeeOptionsQuery,
} from '../../../hooks/use-organization';
import { useLookupsQuery } from '../../../hooks/use-master-data';

export const CandidateFormPage: React.FC = () => {
  const navigate = useNavigate();

  // Queries
  const { data: nextCodeData } = useNextCandidateCodeQuery();
  const { data: roles = [] } = useRoleOptionsQuery();
  const { data: departments = [] } = useDepartmentOptionsQuery();
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

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
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

  // Role & Experience State
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(undefined);
  const [selectedDepId, setSelectedDepId] = useState<number | undefined>(undefined);
  const [stage, setStage] = useState('new');
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

  // Source State
  const [source, setSource] = useState('job_portal');
  const [sourcePortal, setSourcePortal] = useState('naukri');
  const [referredByEmpId, setReferredByEmpId] = useState<number | undefined>(undefined);
  const [consultancyName, setConsultancyName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [sourceDetails, setSourceDetails] = useState('');
  const [notes, setNotes] = useState('');

  // Duplicate state
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Derived helper for selected role and department
  const selectedRole = roles.find((r: any) => r.role_id === selectedRoleId);
  const selectedDepartment = departments.find((d: any) => d.dep_id === selectedDepId);
  const departmentDisplayName =
    selectedDepartment?.name ||
    selectedRole?.dep_name ||
    (selectedRoleId ? 'Department not assigned' : 'Select a position first');

  // Auto-select department when role changes
  const handleRoleChange = (roleIdStr: string) => {
    const roleId = roleIdStr ? parseInt(roleIdStr, 10) : undefined;
    setSelectedRoleId(roleId);

    if (roleId) {
      const matchedRole = roles.find((r: any) => r.role_id === roleId);
      if (matchedRole && matchedRole.dep_id) {
        setSelectedDepId(matchedRole.dep_id);
      } else {
        setSelectedDepId(undefined);
      }
      setErrors((prev) => {
        const rest = { ...prev };
        delete rest.role;
        delete rest.department;
        return rest;
      });
    } else {
      setSelectedDepId(undefined);
    }
  };

  // Sync department automatically whenever role selection or roles list changes
  useEffect(() => {
    if (selectedRoleId) {
      const matched = roles.find((r: any) => r.role_id === selectedRoleId);
      if (matched?.dep_id && matched.dep_id !== selectedDepId) {
        setSelectedDepId(matched.dep_id);
      }
    }
  }, [selectedRoleId, roles]);

  // Debounced Duplicate Check
  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    if (cleanPhone.length === 10 || isValidEmail) {
      const timer = setTimeout(() => {
        checkDuplicateMutation.mutate(
          { phone: cleanPhone, email: email.trim() },
          {
            onSuccess: (matches) => {
              setDuplicates(matches);
            },
          },
        );
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setDuplicates([]);
    }
  }, [phone, email]);

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

  // Form Validation
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
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    createCandidateMutation.mutate(
      {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        gender_id: genderId,
        current_location: currentLocation.trim() || undefined,
        resume_url: resumeUrl || undefined,
        resume_filename: resumeFilename || undefined,
        resume_size: resumeSize,
        resume_mime: resumeMime || undefined,
        role_id: selectedRoleId!,
        dep_id: selectedDepId!,
        stage: stage || 'new',
        experience_type: experienceType,
        exp_years: experienceType === 'fresher' ? 0 : expYears,
        exp_months: experienceType === 'fresher' ? 0 : expMonths,
        current_company: experienceType === 'fresher' ? undefined : currentCompany.trim() || undefined,
        current_designation: experienceType === 'fresher' ? undefined : currentDesignation.trim() || undefined,
        current_ctc: experienceType === 'fresher' || !currentCtc ? undefined : Number(currentCtc),
        expected_ctc: expectedCtc ? Number(expectedCtc) : undefined,
        notice_period: experienceType === 'fresher' ? undefined : noticePeriod,
        serving_notice_lwd: experienceType === 'fresher' || noticePeriod !== 'serving_notice' ? undefined : servingNoticeLwd || undefined,
        key_skills: skills,
        source,
        source_portal: source === 'job_portal' ? sourcePortal : undefined,
        referred_by_emp_id: source === 'employee_referral' ? referredByEmpId : undefined,
        consultancy_name: source === 'consultancy' ? consultancyName.trim() : undefined,
        college_name: source === 'campus' ? collegeName.trim() : undefined,
        source_details: source === 'other' ? sourceDetails.trim() : undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          navigate('/admin/recruitment');
        },
        onError: (err: any) => {
          setErrors((prev) => ({ ...prev, form: err.message || 'Failed to create candidate' }));
        },
      },
    );
  };

  const previewCandidateCode = nextCodeData?.candidate_code || 'CAN-XXXX';

  return (
    <AdminLayout title="Add New Candidate" fluid>
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6 pb-20">
        {/* Page Header with Left-aligned Back Button */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <Link to="/admin/recruitment" className="hover:text-blue-600 transition">
              Recruitment
            </Link>
            <span>/</span>
            <Link to="/admin/recruitment" className="hover:text-blue-600 transition">
              Candidates
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Add Candidate</span>
          </div>

          <div className="flex items-start gap-3.5">
            <button
              type="button"
              onClick={() => navigate('/admin/recruitment')}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition mt-0.5 shrink-0"
              title="Back to Candidates"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add New Candidate</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter candidate profile information, pipeline stage, and experience details
              </p>
            </div>
          </div>
        </div>

        {/* Duplicate Warning Banner */}
        {duplicates.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 shadow-xs space-y-2">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <h4 className="font-semibold text-amber-900">
                  {duplicates.some((d) => d.type === 'employee')
                    ? 'Active Employee Match Found'
                    : 'Potential Duplicate Candidate Detected'}
                </h4>
                <div className="mt-1 space-y-1 text-amber-800 text-xs">
                  {duplicates.map((d, i) => (
                    <div key={d.id || i} className="flex items-center gap-2">
                      <span className="font-mono font-semibold bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">
                        {d.code}
                      </span>
                      <span className="font-medium">{d.name}</span>
                      <span>({d.email} • {d.phone})</span>
                      {d.stage && (
                        <span className="capitalize text-amber-700 bg-amber-200/50 px-1.5 py-0.2 rounded text-[11px]">
                          {d.stage}
                        </span>
                      )}
                      {d.type === 'employee' ? (
                        <span className="text-rose-700 font-semibold ml-1">
                          (Already an employee!)
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-700 mt-2">
                  You may still continue adding this candidate if this is intentional.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Global Error message */}
        {errors.form && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 font-medium">
            {errors.form}
          </div>
        )}

        {/* Card 1: Basic Information */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Candidate Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Candidate ID (Locked) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Candidate ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={previewCandidateCode}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-100/80 text-slate-500 font-mono font-medium cursor-not-allowed pl-9"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">System-generated upon saving</p>
            </div>

            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rohan Mehta"
                className={`w-full px-3 py-2 text-sm rounded-xl border ${
                  errors.name ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white`}
              />
              {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 text-xs font-medium">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98250 11223"
                  className={`w-full px-3 py-2 text-sm rounded-r-xl border ${
                    errors.phone ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-mono`}
                />
              </div>
              {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rohan.mehta@gmail.com"
                className={`w-full px-3 py-2 text-sm rounded-xl border ${
                  errors.email ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white`}
              />
              {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Gender
              </label>
              <select
                value={genderId !== undefined ? String(genderId) : ''}
                onChange={(e) => setGenderId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="">Select Gender</option>
                {genders.map((g: any, idx: number) => (
                  <option key={g.id || g.lookup_id || idx} value={g.id || g.lookup_id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Location */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Current Location (City, State)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  placeholder="e.g. Ahmedabad, Gujarat"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white pl-9"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Resume Upload */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Resume</h2>
          </div>

          {resumeUrl ? (
            <div className="flex items-center justify-between p-4 rounded-xl border border-blue-200 bg-blue-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 truncate max-w-sm">
                    {resumeFilename}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {resumeSize ? `${Math.round(resumeSize / 1024)} KB` : 'Uploaded'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition"
                >
                  View
                </a>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemoveResume}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Remove resume"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
            >
              {isUploadingResume ? (
                <>
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-sm font-medium text-slate-700">Uploading resume...</p>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-blue-600 hover:underline">
                      Click to upload
                    </span>{' '}
                    <span className="text-sm text-slate-500">or drag and drop</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    PDF, DOC, DOCX up to 5 MB (Single file upload)
                  </p>
                </>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={handleFileSelect}
          />
          {errors.resume && <p className="text-xs text-rose-500">{errors.resume}</p>}
        </div>

        {/* Card 3: Experience & Role */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Experience, Role & Stage</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Position Applied For */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Position Applied For <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedRoleId !== undefined ? String(selectedRoleId) : ''}
                onChange={(e) => handleRoleChange(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-xl border ${
                  errors.role ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white`}
              >
                <option value="">Select Position / Role</option>
                {roles.map((r: any) => (
                  <option key={r.role_id} value={r.role_id}>
                    {r.role_name}
                  </option>
                ))}
              </select>
              {errors.role && <p className="text-xs text-rose-500 mt-1">{errors.role}</p>}
            </div>

            {/* Department (Locked - auto-mapped from role) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>
                  Department <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Auto-filled
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={departmentDisplayName}
                  placeholder="Auto-filled from role"
                  className={`w-full px-3 py-2 text-sm rounded-xl border ${
                    errors.department ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'
                  } bg-slate-100/80 text-slate-600 font-medium cursor-not-allowed pl-9`}
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {errors.department && (
                <p className="text-xs text-rose-500 mt-1">{errors.department}</p>
              )}
            </div>

            {/* Stage Field (Dropdown Menu from Master Data) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5 text-blue-600" />
                <span>Initial Stage <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white capitalize font-medium text-slate-800"
              >
                {stages.map((st: any, idx: number) => (
                  <option key={st.id || st.code || idx} value={st.code}>
                    {st.label}
                  </option>
                ))}
                {stages.length === 0 && (
                  <>
                    <option value="new">New</option>
                    <option value="screening">Screening</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="selected">Selected</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="on_hold">On Hold</option>
                    <option value="rejected">Rejected</option>
                  </>
                )}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Starting recruitment pipeline status</p>
            </div>
          </div>

          {/* Experience Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Experience Type <span className="text-rose-500">*</span>
            </label>
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setExperienceType('fresher')}
                className={`px-5 py-2 text-xs font-semibold rounded-lg transition ${
                  experienceType === 'fresher'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fresher
              </button>
              <button
                type="button"
                onClick={() => setExperienceType('experienced')}
                className={`px-5 py-2 text-xs font-semibold rounded-lg transition ${
                  experienceType === 'experienced'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Experienced
              </button>
            </div>
          </div>

          {/* Experienced Detailed Fields (Only shown if Experienced) */}
          {experienceType === 'experienced' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              {/* Total Experience Years & Months */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Total Experience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <select
                      value={expYears}
                      onChange={(e) => setExpYears(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    >
                      {Array.from({ length: 51 }, (_, i) => (
                        <option key={i} value={i}>
                          {i} {i === 1 ? 'Year' : 'Years'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={expMonths}
                      onChange={(e) => setExpMonths(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>
                          {i} {i === 1 ? 'Month' : 'Months'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Current Company */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Company
                </label>
                <input
                  type="text"
                  value={currentCompany}
                  onChange={(e) => setCurrentCompany(e.target.value)}
                  placeholder="e.g. Nexa Infotech"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>

              {/* Current Designation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Designation
                </label>
                <input
                  type="text"
                  value={currentDesignation}
                  onChange={(e) => setCurrentDesignation(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>

              {/* Current CTC */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current CTC (₹ / year)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={currentCtc}
                    onChange={(e) => setCurrentCtc(e.target.value)}
                    placeholder="e.g. 480000"
                    className="w-full pl-7 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-mono"
                  />
                </div>
              </div>

              {/* Expected CTC */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Expected CTC (₹ / year)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={expectedCtc}
                    onChange={(e) => setExpectedCtc(e.target.value)}
                    placeholder="e.g. 600000"
                    className="w-full pl-7 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-mono"
                  />
                </div>
              </div>

              {/* Notice Period */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notice Period
                </label>
                <select
                  value={noticePeriod}
                  onChange={(e) => setNoticePeriod(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  {noticePeriods.map((np: any, idx: number) => (
                    <option key={np.id || np.code || idx} value={np.code}>
                      {np.label}
                    </option>
                  ))}
                  {noticePeriods.length === 0 && (
                    <>
                      <option value="immediate">Immediate (0 days)</option>
                      <option value="15_days">15 days</option>
                      <option value="30_days">30 days</option>
                      <option value="60_days">60 days</option>
                      <option value="90_days">90 days</option>
                      <option value="serving_notice">Serving notice</option>
                    </>
                  )}
                </select>
              </div>

              {/* Serving notice Last Working Day */}
              {noticePeriod === 'serving_notice' && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Last Working Day (LWD) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={servingNoticeLwd}
                    onChange={(e) => setServingNoticeLwd(e.target.value)}
                    className={`w-full max-w-xs px-3 py-2 text-sm rounded-xl border ${
                      errors.servingNoticeLwd
                        ? 'border-rose-400 ring-2 ring-rose-100'
                        : 'border-slate-200'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white`}
                  />
                  {errors.servingNoticeLwd && (
                    <p className="text-xs text-rose-500 mt-1">{errors.servingNoticeLwd}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Key Skills Tag Input */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Key Skills
            </label>
            <div className="p-2 border border-slate-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition">
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-blue-900 focus:outline-none"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                onBlur={() => {
                  if (skillInput.trim()) handleAddSkill(skillInput);
                }}
                placeholder={
                  skills.length === 0
                    ? 'Type a skill and press Enter or comma (e.g. React, SQL, Requirement Gathering)...'
                    : 'Add more skills...'
                }
                className="w-full text-sm outline-none px-1 py-1 text-slate-800 placeholder-slate-400"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Press Enter or comma to create a skill tag
            </p>
          </div>
        </div>

        {/* Card 4: Source & Reference */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Source & Reference</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Source Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Source <span className="text-rose-500">*</span>
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                {sources.map((s: any, idx: number) => (
                  <option key={s.id || s.code || idx} value={s.code}>
                    {s.label}
                  </option>
                ))}
                {sources.length === 0 && (
                  <>
                    <option value="job_portal">Job Portal</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="company_website">Company Website</option>
                    <option value="employee_referral">Employee Referral</option>
                    <option value="consultancy">Consultancy</option>
                    <option value="campus">Campus</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="social_media">Social Media</option>
                    <option value="other">Other</option>
                  </>
                )}
              </select>
            </div>

            {/* Conditional Source: Job Portal */}
            {source === 'job_portal' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Portal Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sourcePortal}
                  onChange={(e) => setSourcePortal(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-xl border ${
                    errors.sourcePortal
                      ? 'border-rose-400 ring-2 ring-rose-100'
                      : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white`}
                >
                  {portals.map((p: any, idx: number) => (
                    <option key={p.id || p.code || idx} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                  {portals.length === 0 && (
                    <>
                      <option value="naukri">Naukri.com</option>
                      <option value="indeed">Indeed</option>
                      <option value="foundit">Foundit (Monster)</option>
                      <option value="linkedin_jobs">LinkedIn Jobs</option>
                      <option value="other">Other</option>
                    </>
                  )}
                </select>
                {errors.sourcePortal && (
                  <p className="text-xs text-rose-500 mt-1">{errors.sourcePortal}</p>
                )}
              </div>
            )}

            {/* Conditional Source: Employee Referral */}
            {source === 'employee_referral' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Referred By Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={referredByEmpId !== undefined ? String(referredByEmpId) : ''}
                  onChange={(e) =>
                    setReferredByEmpId(e.target.value ? parseInt(e.target.value, 10) : undefined)
                  }
                  className={`w-full px-3 py-2 text-sm rounded-xl border ${
                    errors.referredBy
                      ? 'border-rose-400 ring-2 ring-rose-100'
                      : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white`}
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp: any) => (
                    <option key={emp.emp_id} value={emp.emp_id}>
                      {emp.name} ({emp.code || `EMP-${emp.emp_id}`})
                    </option>
                  ))}
                </select>
                {errors.referredBy && (
                  <p className="text-xs text-rose-500 mt-1">{errors.referredBy}</p>
                )}
              </div>
            )}

            {/* Conditional Source: Consultancy */}
            {source === 'consultancy' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Consultancy Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={consultancyName}
                  onChange={(e) => setConsultancyName(e.target.value)}
                  placeholder="e.g. Apex Recruitment Services"
                  className={`w-full px-3 py-2 text-sm rounded-xl border ${
                    errors.consultancy
                      ? 'border-rose-400 ring-2 ring-rose-100'
                      : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white`}
                />
                {errors.consultancy && (
                  <p className="text-xs text-rose-500 mt-1">{errors.consultancy}</p>
                )}
              </div>
            )}

            {/* Conditional Source: Campus */}
            {source === 'campus' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  College / Campus Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. DAIICT / Nirma University"
                  className={`w-full px-3 py-2 text-sm rounded-xl border ${
                    errors.college
                      ? 'border-rose-400 ring-2 ring-rose-100'
                      : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white`}
                />
                {errors.college && (
                  <p className="text-xs text-rose-500 mt-1">{errors.college}</p>
                )}
              </div>
            )}

            {/* Conditional Source: Social Media */}
            {source === 'social_media' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Platform Name (Optional)
                </label>
                <input
                  type="text"
                  value={sourceDetails}
                  onChange={(e) => setSourceDetails(e.target.value)}
                  placeholder="e.g. Instagram / Facebook"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>
            )}

            {/* Conditional Source: Other */}
            {source === 'other' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Source Details <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={sourceDetails}
                  onChange={(e) => setSourceDetails(e.target.value)}
                  placeholder="Specify source details..."
                  className={`w-full px-3 py-2 text-sm rounded-xl border ${
                    errors.sourceDetails
                      ? 'border-rose-400 ring-2 ring-rose-100'
                      : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white`}
                />
                {errors.sourceDetails && (
                  <p className="text-xs text-rose-500 mt-1">{errors.sourceDetails}</p>
                )}
              </div>
            )}
          </div>

          {/* Notes Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Recruiter Notes / Comments
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional comments, impressions, or scheduling constraints..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            to="/admin/recruitment"
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createCandidateMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-sm shadow-blue-500/20"
          >
            {createCandidateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Candidate...</span>
              </>
            ) : (
              <span>Save Candidate</span>
            )}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
};
