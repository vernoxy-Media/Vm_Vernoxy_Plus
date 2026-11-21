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
  Lock,
  Eye,
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
import { parseApiError } from '@/shared/utils/api-error';
import {
  FIELD_TAB,
  ctcError,
  digitsOnly,
  emailError,
  experienceError,
  futureDateError,
  locationError,
  nameError,
  phoneError,
  skillError,
  textError,
  todayIso,
} from '../utils/candidate-validation';

/** Stages that have their own form (decision, conversion) and so cannot be picked when adding a candidate */
const FORM_ONLY_STAGES = ['open', 'selected', 'on_hold', 'rejected', 'onboarding', 'joined', 'did_not_join'];

/** Server field name -> the key this form keeps its message under */
const SERVER_FIELD_TO_KEY: Record<string, string> = {
  role_id: 'role',
  dep_id: 'department',
  serving_notice_lwd: 'servingNoticeLwd',
  source_portal: 'sourcePortal',
  referred_by_emp_id: 'referredBy',
  consultancy_name: 'consultancy',
  college_name: 'college',
  source_details: 'sourceDetails',
  current_ctc: 'currentCtc',
  expected_ctc: 'expectedCtc',
  exp_years: 'experience',
  exp_months: 'experience',
  experience_type: 'experience',
  current_location: 'city',
  key_skills: 'skills',
  current_company: 'currentCompany',
  current_designation: 'currentDesignation',
  assigned_to_emp_id: 'assignedTo',
};

/** The same words as the server uses when it refuses a duplicate */
function duplicateText(d: DuplicateMatch, typedEmail: string): string {
  const what = d.email && d.email.toLowerCase() === typedEmail.trim().toLowerCase() ? 'email address' : 'phone number';
  return d.type === 'employee'
    ? `This ${what} belongs to the employee ${d.name} (${d.code}). An existing employee cannot be added as a candidate.`
    : `A candidate with this ${what} already exists: ${d.name} (${d.code}).`;
}

function formatExp(years?: number | null, months?: number | null): string {
  const y = years || 0;
  const m = months || 0;
  if (!y && !m) return '';
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} ${y === 1 ? 'year' : 'years'}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? 'month' : 'months'}`);
  return parts.join(' ');
}

function parseExperienceString(str: string): { years: number; months: number } {
  if (!str || !str.trim()) return { years: 0, months: 0 };
  const s = str.trim().toLowerCase();

  const yrMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?|y\b)/);
  const moMatch = s.match(/(\d+)\s*(?:months?|mos?|m\b)/);

  if (yrMatch || moMatch) {
    let years = yrMatch ? parseFloat(yrMatch[1]) : 0;
    let months = moMatch ? parseInt(moMatch[1], 10) : 0;
    if (!moMatch && years % 1 !== 0) {
      const dec = years % 1;
      years = Math.floor(years);
      months = Math.round(dec * 12);
    }
    return { years: Math.floor(years), months: Math.min(11, months) };
  }

  const numMatch = s.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) {
    const val = parseFloat(numMatch[1]);
    const years = Math.floor(val);
    const months = Math.min(11, Math.round((val % 1) * 12));
    return { years, months };
  }

  return { years: 0, months: 0 };
}

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
    mode: 'added' | 'updated';
  } | null>(null);

  // Queries
  const { data: nextCodeData } = useNextCandidateCodeQuery();
  const [selectedDepId, setSelectedDepId] = useState<number | undefined>(undefined);
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(undefined);

  const { data: departments = [] } = useDepartmentOptionsQuery();
  const { data: roles = [] } = useRoleOptionsQuery(selectedDepId);
  const { data: employees = [] } = useEmployeeOptionsQuery();
  // Active employees, searchable by name, code and email (referrer and assignee pickers)
  const employeeOptions = React.useMemo(
    () =>
      employees
        .filter((e) => !e.status || e.status === 'Active')
        .map((e) => ({
          value: e.emp_id,
          label: e.employee_code ? `${e.name} (${e.employee_code})` : e.name,
          sublabel: [e.role_name, e.email].filter(Boolean).join(' · '),
        })),
    [employees],
  );

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
  const [city, setCity] = useState('');
  const [stateLoc, setStateLoc] = useState('');

  // Resume State
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeFilename, setResumeFilename] = useState('');
  const [resumeSize, setResumeSize] = useState<number | undefined>(undefined);
  const [resumeMime, setResumeMime] = useState('');
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State - Role & Experience
  const [stage, setStage] = useState('new');
  const [experienceType, setExperienceType] = useState<'fresher' | 'experienced'>('experienced');
  const [expYears, setExpYears] = useState(0);
  const [expMonths, setExpMonths] = useState(0);
  const [totalExperience, setTotalExperience] = useState('');
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
  const [assignedToEmpId, setAssignedToEmpId] = useState<number | undefined>(undefined);

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
      const locStr = candidateToEdit.current_location || candidateToEdit.currentLocation || '';
      const locParts = locStr.split(',');
      setCity(locParts[0]?.trim() || '');
      setStateLoc(locParts.slice(1).join(',').trim() || '');
      setResumeUrl(candidateToEdit.resume_url || candidateToEdit.resumeUrl || '');
      setResumeFilename(candidateToEdit.resume_filename || candidateToEdit.resumeFilename || '');
      setResumeSize(candidateToEdit.resume_size ?? candidateToEdit.resumeSize ?? undefined);
      setResumeMime(candidateToEdit.resume_mime || candidateToEdit.resumeMime || '');
      setSelectedDepId(candidateToEdit.dep_id ?? candidateToEdit.depId ?? undefined);
      setSelectedRoleId(candidateToEdit.role_id ?? candidateToEdit.roleId ?? undefined);
      setStage(candidateToEdit.stage || 'new');
      setExperienceType(candidateToEdit.experience_type || candidateToEdit.experienceType || 'experienced');
      const initY = candidateToEdit.exp_years ?? candidateToEdit.expYears ?? 0;
      const initM = candidateToEdit.exp_months ?? candidateToEdit.expMonths ?? 0;
      setExpYears(initY);
      setExpMonths(initM);
      setTotalExperience(formatExp(initY, initM));
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
      setAssignedToEmpId(candidateToEdit.assigned_to_emp_id ?? undefined);
      setSkillInput('');
      setCreatedCandidate(null);
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
              // When editing, the candidate itself is not a duplicate
              const currentId = candidateToEdit?.candidate_id ?? candidateToEdit?.candidateId;
              const filteredMatches = (matches || []).filter((m) => !(m.type === 'candidate' && m.id === currentId));
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

  // Skill Chip Handlers. Returns the skills after adding, so a skill still being typed is not lost on save.
  const handleAddSkill = (val: string): string[] => {
    const trimmed = val.trim().replace(/^,+|,+$/g, '').replace(/\s+/g, ' ');
    if (!trimmed) {
      setSkillInput('');
      return skills;
    }
    const problem = skillError(trimmed, skills);
    if (problem) {
      // A repeat is simply dropped; anything else stays in the box with the reason under it
      if (problem.includes('already added')) setSkillInput('');
      setErrors((prev) => ({ ...prev, skills: problem }));
      return skills;
    }
    const next = [...skills, trimmed];
    setSkills(next);
    setSkillInput('');
    setErrors((prev) => ({ ...prev, skills: '' }));
    return next;
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

  // Jump to the first field that needs attention so the user sees what is missing
  const focusFirstInvalid = (ids: string[]) => {
    setTimeout(() => {
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          el.focus({ preventScroll: true });
          break;
        }
      }
    }, 0);
  };

  // Validation
  const handleContinue = () => {
    // Tabs can be browsed freely; everything is checked when the candidate is added
    if (activeTab === 'info') setActiveTab('experience');
    else if (activeTab === 'experience') setActiveTab('source');
  };

  // Error keys on each tab, for the red dot on the tab and for opening the tab with the first mistake
  const INFO_KEYS = ['name', 'phone', 'email', 'city', 'state', 'resume', 'duplicate'];
  const EXPERIENCE_KEYS = ['role', 'department', 'experience', 'currentCompany', 'currentDesignation', 'currentCtc', 'expectedCtc', 'servingNoticeLwd', 'skills'];
  const SOURCE_KEYS = ['sourcePortal', 'referredBy', 'consultancy', 'college', 'sourceDetails', 'stage', 'assignedTo'];
  const tabHasError = (keys: string[]) => keys.some((k) => Boolean(errors[k]));

  const showErrors = (errs: Record<string, string>) => {
    setErrors(errs);
    const first = (keys: string[]) => keys.some((k) => errs[k]);
    if (first(INFO_KEYS)) {
      setActiveTab('info');
      focusFirstInvalid([errs.name ? 'cand-name' : '', errs.phone ? 'cand-phone' : '', errs.email ? 'cand-email' : ''].filter(Boolean));
    } else if (first(EXPERIENCE_KEYS)) {
      setActiveTab('experience');
    } else if (first(SOURCE_KEYS)) {
      setActiveTab('source');
    }
  };

  const validateForm = (skillList: string[]) => {
    const errs: Record<string, string> = {};
    const put = (key: string, msg: string) => {
      if (msg && !errs[key]) errs[key] = msg;
    };

    put('name', nameError(name));
    put('phone', phoneError(phone));
    put('email', emailError(email));
    put('city', locationError(city, 'City'));
    put('state', locationError(stateLoc, 'State'));
    if (duplicates.length > 0) put('duplicate', duplicateText(duplicates[0], email));

    if (!selectedDepId) put('department', 'Please select a department.');
    if (!selectedRoleId) put('role', 'Please select a position applied for.');

    if (experienceType === 'experienced') {
      put('experience', experienceError(expYears, expMonths));
      put('currentCompany', textError(currentCompany, 'Current company'));
      put('currentDesignation', textError(currentDesignation, 'Current designation'));
      put('currentCtc', ctcError(currentCtc, 'Current CTC'));
      if (noticePeriod === 'serving_notice') {
        // An unchanged date saved earlier may have passed; only a new date has to be in the future
        const savedLwd = candidateToEdit?.serving_notice_lwd ? String(candidateToEdit.serving_notice_lwd).slice(0, 10) : '';
        put('servingNoticeLwd', servingNoticeLwd && servingNoticeLwd === savedLwd ? '' : futureDateError(servingNoticeLwd, 'Last working day'));
      }
    }
    put('expectedCtc', ctcError(expectedCtc, 'Expected CTC'));
    if (skillList.length > 30) put('skills', 'At most 30 key skills can be added.');

    if (source === 'job_portal' && !sourcePortal) put('sourcePortal', 'Please select a job portal.');
    if (source === 'employee_referral' && !referredByEmpId) put('referredBy', 'Please select the referring employee.');
    if (source === 'consultancy') put('consultancy', consultancyName.trim() ? textError(consultancyName, 'Consultancy name') : 'Consultancy name is required.');
    if (source === 'campus') put('college', collegeName.trim() ? textError(collegeName, 'College name') : 'College name is required.');
    if (source === 'other' && !sourceDetails.trim()) put('sourceDetails', 'Please describe how the candidate was sourced.');

    showErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /** A refusal from the server: its message next to the field it names, on the right tab */
  const showServerError = (err: unknown, fallback: string) => {
    const parsed = parseApiError(err, fallback);
    const fieldIssue = parsed.issues.find((i) => i.field);
    if (fieldIssue?.field) {
      const key = SERVER_FIELD_TO_KEY[fieldIssue.field] ?? fieldIssue.field;
      setErrors({ [key]: fieldIssue.message });
      setActiveTab(FIELD_TAB[fieldIssue.field] ?? 'info');
      setGlobalError(fieldIssue.message);
    } else {
      setGlobalError(parsed.message);
    }
  };

  // Reset Form
  const resetForm = () => {
    setName('');
    setPhone('');
    setCountryCode('+91');
    setEmail('');
    setGenderId(undefined);
    setCity('');
    setStateLoc('');
    setResumeUrl('');
    setResumeFilename('');
    setResumeSize(undefined);
    setResumeMime('');
    setSelectedRoleId(undefined);
    setSelectedDepId(undefined);
    setStage('new');
    setExperienceType('experienced');
    setExpYears(0);
    setExpMonths(0);
    setTotalExperience('');
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
    setAssignedToEmpId(undefined);
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
    // A skill still in the box counts, so it is not lost when the user forgets to press Enter
    const skillList = skillInput.trim() ? handleAddSkill(skillInput) : skills;
    if (skillInput.trim() && skillList === skills) {
      setActiveTab('experience');
      return;
    }
    if (!validateForm(skillList)) return;

    setGlobalError(null);
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const currentLocation = [city.trim(), stateLoc.trim()].filter(Boolean).join(', ');
    const experienced = experienceType === 'experienced';
    // When editing, an emptied field is sent as null so it is really cleared (left out, it would keep its old value)
    const none = candidateToEdit ? null : undefined;
    const payload = {
      name: name.trim().replace(/\s+/g, ' '),
      phone: cleanPhone,
      email: email.trim().toLowerCase(),
      gender_id: genderId ?? none,
      current_location: currentLocation || none,
      resume_url: resumeUrl || none,
      resume_filename: resumeFilename || none,
      resume_size: resumeSize ?? none,
      resume_mime: resumeMime || none,
      role_id: selectedRoleId!,
      dep_id: selectedDepId!,
      experience_type: experienceType,
      exp_years: experienced ? expYears : 0,
      exp_months: experienced ? expMonths : 0,
      current_company: (experienced && currentCompany.trim()) || none,
      current_designation: (experienced && currentDesignation.trim()) || none,
      current_ctc: experienced && currentCtc ? Number(currentCtc) : none,
      expected_ctc: expectedCtc ? Number(expectedCtc) : none,
      notice_period: experienced ? noticePeriod : none,
      serving_notice_lwd: experienced && noticePeriod === 'serving_notice' ? servingNoticeLwd || none : none,
      key_skills: skillList,
      source,
      source_portal: source === 'job_portal' ? sourcePortal : none,
      referred_by_emp_id: source === 'employee_referral' ? referredByEmpId : none,
      consultancy_name: source === 'consultancy' ? consultancyName.trim() : none,
      college_name: source === 'campus' ? collegeName.trim() : none,
      source_details: source === 'other' ? sourceDetails.trim() : none,
      notes: notes.trim() || none,
      assigned_to_emp_id: assignedToEmpId ?? none,
    };

    if (candidateToEdit) {
      // The stage is changed from the stage menu and the decision form, not from here
      const cid = candidateToEdit.candidate_id ?? candidateToEdit.candidateId;
      updateCandidateMutation.mutate(
        { candidateId: cid, data: payload },
        {
          onSuccess: (res) => {
            setCreatedCandidate({
              candidate_id: res.candidate_id ?? cid,
              candidate_code: res.candidate_code || candidateToEdit.candidate_code,
              name: res.name || name.trim(),
              mode: 'updated',
            });
            if (onSuccess) onSuccess();
          },
          onError: (err: unknown) => showServerError(err, 'Failed to update candidate. Please try again.'),
        },
      );
      return;
    }

    createCandidateMutation.mutate(
      { ...payload, stage: stage || 'new' } as Parameters<typeof createCandidateMutation.mutate>[0],
      {
        onSuccess: (res) => {
          setCreatedCandidate({
            candidate_id: res.candidate_id,
            candidate_code: res.candidate_code || 'CAN-XXXX',
            name: res.name || name.trim(),
            mode: 'added',
          });
          if (onSuccess) onSuccess();
        },
        onError: (err: unknown) => showServerError(err, 'Failed to create candidate. Please try again.'),
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
            <h3 className="text-xl font-bold text-slate-900">
              {createdCandidate.mode === 'updated' ? 'Candidate Updated Successfully!' : 'Candidate Added Successfully!'}
            </h3>
            <p className="text-xs text-slate-500">
              {createdCandidate.mode === 'updated' ? 'The changes to ' : 'Candidate profile created for '}
              <span className="font-semibold text-slate-800">{createdCandidate.name}</span>
              {createdCandidate.mode === 'updated' ? ' have been saved. Reference code:' : ' with reference code:'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
            <span className="text-xs text-slate-500 font-medium">Candidate Reference Code:</span>
            <div className="text-lg font-mono font-bold text-blue-600 tracking-wider">
              {createdCandidate.candidate_code}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            {createdCandidate.mode === 'added' && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Add Another Candidate
              </button>
            )}
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
            {tabHasError(INFO_KEYS) && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Needs attention" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('experience')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'experience'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Position & Experience</span>
            {tabHasError(EXPERIENCE_KEYS) && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Needs attention" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('source')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'source'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Source & Notes</span>
            {tabHasError(SOURCE_KEYS) && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Needs attention" />}
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
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3" role="alert">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 space-y-1">
                {duplicates.map((d) => (
                  <p key={`${d.type}-${d.id}`} className="font-semibold">
                    {duplicateText(d, email)}
                  </p>
                ))}
                <p className="text-amber-700">Change the email or phone number to continue.</p>
              </div>
            </div>
          )}

          {/* TAB 1: CANDIDATE INFO */}
          {activeTab === 'info' && (
            <div className="space-y-4.5 animate-in fade-in duration-150">
              {/* Marker 1: Candidate ID */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 tracking-tight flex items-center gap-1.5">
                  <span>Candidate ID</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={
                      candidateToEdit
                        ? candidateToEdit.candidate_code || `CAN-${String(candidateToEdit.candidate_id || candidateToEdit.candidateId).padStart(4, '0')}`
                        : (nextCodeData?.candidate_code || 'CAN-XXXX')
                    }
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-[13.5px] font-mono font-bold text-slate-500 cursor-not-allowed select-none"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400">Filled by the system. Cannot be changed.</p>
              </div>

              {/* Marker 2: Full Name */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="cand-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Enter candidate full name"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border ${errors.name ? 'border-red-400' : 'border-slate-200'} rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition`}
                />
                {errors.name && <p className="text-[11px] text-red-500 font-medium">{errors.name}</p>}
              </div>

              {/* Marker 3 & Marker 4: Phone Number & Email Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                    id="cand-phone"
                    placeholder="Enter 10-digit number"
                    error={errors.phone}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="cand-email"
                    type="text"
                    inputMode="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="Enter email address"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border ${errors.email ? 'border-red-400' : 'border-slate-200'} rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition`}
                  />
                  {errors.email && <p className="text-[11px] text-red-500 font-medium">{errors.email}</p>}
                </div>
              </div>

              {/* Marker 5: Current Location (City and State - 2 separate fields) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">City</label>
                  <input
                    type="text"
                    value={city}
                    maxLength={120}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (errors.city) setErrors((prev) => ({ ...prev, city: '' }));
                    }}
                    placeholder="e.g. Surat"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border ${errors.city ? 'border-red-400' : 'border-slate-200'} rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition`}
                  />
                  {errors.city && <p className="text-[11px] text-red-500 font-medium">{errors.city}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">State</label>
                  <input
                    type="text"
                    value={stateLoc}
                    maxLength={120}
                    onChange={(e) => {
                      setStateLoc(e.target.value);
                      if (errors.state) setErrors((prev) => ({ ...prev, state: '' }));
                    }}
                    placeholder="e.g. Gujarat"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border ${errors.state ? 'border-red-400' : 'border-slate-200'} rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition`}
                  />
                  {errors.state && <p className="text-[11px] text-red-500 font-medium">{errors.state}</p>}
                </div>
              </div>

              {/* Marker 6: Resume Upload / Management */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Resume / CV Document</label>
                  <span className="text-[11px] text-slate-400">PDF, DOC, DOCX up to 5MB</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {resumeFilename ? (
                  <div className="flex items-center justify-between p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{resumeFilename}</p>
                        {resumeSize && (
                          <p className="text-[10px] text-slate-500">{(resumeSize / 1024).toFixed(0)} KB</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {resumeUrl && (
                        <a
                          href={resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 hover:text-blue-800 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg shadow-2xs transition"
                          title="View resume"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingResume}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition cursor-pointer"
                        title="Replace resume file"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveResume}
                        disabled={isUploadingResume}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Remove resume"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
                  >
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
                        maxLength={255}
                        onChange={(e) => {
                          setCurrentCompany(e.target.value);
                          if (errors.currentCompany) setErrors((prev) => ({ ...prev, currentCompany: '' }));
                        }}
                        placeholder="e.g. Acme Technologies"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border ${errors.currentCompany ? 'border-red-400' : 'border-slate-200'} rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition`}
                      />
                      {errors.currentCompany && <p className="text-[11px] text-red-500 font-medium">{errors.currentCompany}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Current Designation</label>
                      <input
                        type="text"
                        value={currentDesignation}
                        maxLength={255}
                        onChange={(e) => {
                          setCurrentDesignation(e.target.value);
                          if (errors.currentDesignation) setErrors((prev) => ({ ...prev, currentDesignation: '' }));
                        }}
                        placeholder="e.g. Senior Frontend Developer"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border ${errors.currentDesignation ? 'border-red-400' : 'border-slate-200'} rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition`}
                      />
                      {errors.currentDesignation && <p className="text-[11px] text-red-500 font-medium">{errors.currentDesignation}</p>}
                    </div>
                  </div>

                  {/* Total Experience (Image 2) */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                      Total Experience <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="candidate-exp-presets"
                      value={totalExperience}
                      maxLength={30}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTotalExperience(val);
                        const parsed = parseExperienceString(val);
                        setExpYears(parsed.years);
                        setExpMonths(parsed.months);
                        if (errors.experience) setErrors((prev) => ({ ...prev, experience: '' }));
                      }}
                      placeholder="3 years 4 months"
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border ${errors.experience ? 'border-red-400' : 'border-slate-200'} rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition`}
                    />
                    {errors.experience ? (
                      <p className="text-[11px] text-red-500 font-medium">{errors.experience}</p>
                    ) : (
                      totalExperience.trim() && (
                        <p className="text-[11px] text-slate-400">
                          Read as {expYears} {expYears === 1 ? 'year' : 'years'} {expMonths} {expMonths === 1 ? 'month' : 'months'}
                        </p>
                      )
                    )}
                    <datalist id="candidate-exp-presets">
                      <option value="6 months" />
                      <option value="1 year" />
                      <option value="2 years" />
                      <option value="3 years" />
                      <option value="3 years 4 months" />
                      <option value="4 years" />
                      <option value="5 years" />
                      <option value="7 years" />
                      <option value="10 years" />
                    </datalist>
                  </div>

                  {/* CTCs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Current CTC (₹ / annum)</label>
                      <input
                        id="cand-current-ctc"
                        type="text"
                        inputMode="numeric"
                        value={currentCtc}
                        onChange={(e) => {
                          setCurrentCtc(digitsOnly(e.target.value));
                          if (errors.currentCtc) setErrors((prev) => ({ ...prev, currentCtc: '' }));
                        }}
                        placeholder="e.g. 600000"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border ${errors.currentCtc ? 'border-red-400' : 'border-slate-200'} rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition`}
                      />
                      {errors.currentCtc && <p className="text-[11px] text-red-500 font-medium">{errors.currentCtc}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Expected CTC (₹ / annum)</label>
                      <input
                        id="cand-expected-ctc"
                        type="text"
                        inputMode="numeric"
                        value={expectedCtc}
                        onChange={(e) => {
                          setExpectedCtc(digitsOnly(e.target.value));
                          if (errors.expectedCtc) setErrors((prev) => ({ ...prev, expectedCtc: '' }));
                        }}
                        placeholder="e.g. 850000"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border ${errors.expectedCtc ? 'border-red-400' : 'border-slate-200'} rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition`}
                      />
                      {errors.expectedCtc && <p className="text-[11px] text-red-500 font-medium">{errors.expectedCtc}</p>}
                    </div>
                  </div>

                  {/* Notice Period */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Notice Period</label>
                      <SearchableSelect
                        options={noticePeriods.map((np) => ({ value: np.code, label: np.label }))}
                        value={noticePeriod}
                        onChange={(val) => setNoticePeriod(val ? String(val) : '30_days')}
                        placeholder="Select notice period"
                        searchPlaceholder="Search notice period..."
                      />
                    </div>

                    {noticePeriod === 'serving_notice' && (
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                          Last Working Day (LWD) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          min={todayIso()}
                          value={servingNoticeLwd}
                          onChange={(e) => {
                            setServingNoticeLwd(e.target.value);
                            if (errors.servingNoticeLwd) setErrors((prev) => ({ ...prev, servingNoticeLwd: '' }));
                          }}
                          className={`w-full px-3.5 py-2.5 bg-slate-50 border ${errors.servingNoticeLwd ? 'border-red-400' : 'border-slate-200'} rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition`}
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
                    type="text"
                    inputMode="numeric"
                    value={expectedCtc}
                    onChange={(e) => {
                      setExpectedCtc(digitsOnly(e.target.value));
                      if (errors.expectedCtc) setErrors((prev) => ({ ...prev, expectedCtc: '' }));
                    }}
                    placeholder="e.g. 350000"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border ${errors.expectedCtc ? 'border-red-400' : 'border-slate-200'} rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition`}
                  />
                  {errors.expectedCtc && <p className="text-[11px] text-red-500 font-medium">{errors.expectedCtc}</p>}
                </div>
              )}

              {/* Key Skills */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Key Skills</label>
                  <span className="text-[11px] text-slate-400">Press Enter, comma or Add · {skills.length}/30</span>
                </div>
                <div className={`w-full p-2 bg-slate-50 border ${errors.skills ? 'border-red-400' : 'border-slate-200'} rounded-xl flex flex-wrap gap-1.5 items-center min-h-[42px]`}>
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
                    maxLength={60}
                    onChange={(e) => {
                      setSkillInput(e.target.value);
                      if (errors.skills) setErrors((prev) => ({ ...prev, skills: '' }));
                    }}
                    onKeyDown={handleSkillKeyDown}
                    onBlur={() => skillInput.trim() && handleAddSkill(skillInput)}
                    placeholder={skills.length === 0 ? 'Type skill and press Enter (e.g. React, Node.js)' : 'Add skill...'}
                    className="flex-1 min-w-[140px] bg-transparent text-[13.5px] focus:outline-hidden px-1"
                  />
                  {skillInput.trim() && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleAddSkill(skillInput)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                    >
                      Add
                    </button>
                  )}
                </div>
                {errors.skills && <p className="text-[11px] text-red-500 font-medium">{errors.skills}</p>}
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
                <SearchableSelect
                  id="cand-source"
                  options={sources.map((s) => ({ value: s.code, label: s.label }))}
                  value={source}
                  onChange={(val) => {
                    setSource(val ? String(val) : 'job_portal');
                    setErrors((prev) => ({ ...prev, sourcePortal: '', referredBy: '', consultancy: '', college: '', sourceDetails: '' }));
                  }}
                  placeholder="Select source"
                  searchPlaceholder="Search source..."
                />
              </div>

              {/* Conditional Source Inputs */}
              {source === 'job_portal' && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Job Portal <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={portals.map((p) => ({ value: p.code, label: p.label }))}
                    value={sourcePortal}
                    onChange={(val) => {
                      setSourcePortal(val ? String(val) : '');
                      if (errors.sourcePortal) setErrors((prev) => ({ ...prev, sourcePortal: '' }));
                    }}
                    placeholder="Select job portal"
                    searchPlaceholder="Search portal..."
                    error={errors.sourcePortal}
                  />
                  {errors.sourcePortal && <p className="text-[11px] text-red-500 font-medium">{errors.sourcePortal}</p>}
                </div>
              )}

              {source === 'employee_referral' && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Referred By <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    id="cand-referred-by"
                    options={employeeOptions}
                    value={referredByEmpId}
                    onChange={(val) => {
                      setReferredByEmpId(val ? Number(val) : undefined);
                      if (errors.referredBy) setErrors((prev) => ({ ...prev, referredBy: '' }));
                    }}
                    placeholder="Select the employee who referred this candidate"
                    searchPlaceholder="Search by name, code or email..."
                    error={errors.referredBy}
                    clearable
                  />
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

              {/* Initial Stage: only when adding; afterwards the stage moves with the stage menu and the decision form */}
              {!candidateToEdit && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Initial Pipeline Stage</label>
                  <SearchableSelect
                    options={stages
                      .filter((st) => !FORM_ONLY_STAGES.includes(st.code.toLowerCase()))
                      .map((st) => ({ value: st.code, label: st.label }))}
                    value={stage}
                    onChange={(val) => setStage(val ? String(val) : 'new')}
                    placeholder="Select stage"
                    searchPlaceholder="Search stage..."
                    error={errors.stage}
                  />
                  {errors.stage && <p className="text-[11px] text-red-500 font-medium">{errors.stage}</p>}
                </div>
              )}

              {/* Assignee: the employee who moves this candidate through the stages */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Assign To</label>
                  <span className="text-[11px] text-slate-400">Optional · can move the candidate between stages</span>
                </div>
                <SearchableSelect
                  id="cand-assigned-to"
                  options={employeeOptions}
                  value={assignedToEmpId}
                  onChange={(val) => {
                    setAssignedToEmpId(val ? Number(val) : undefined);
                    if (errors.assignedTo) setErrors((prev) => ({ ...prev, assignedTo: '' }));
                  }}
                  placeholder="Not assigned"
                  searchPlaceholder="Search by name, code or email..."
                  error={errors.assignedTo}
                  clearable
                />
                {errors.assignedTo && <p className="text-[11px] text-red-500 font-medium">{errors.assignedTo}</p>}
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
