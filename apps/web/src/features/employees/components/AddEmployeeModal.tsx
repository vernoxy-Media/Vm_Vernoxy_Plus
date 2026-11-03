import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  User,
  Building2,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Lock,
  Copy,
  CheckCircle,
  Upload,
} from 'lucide-react';
import {
  useDepartmentOptionsQuery,
  useRoleOptionsQuery,
  useEmployeeOptionsQuery,
  useCreateEmployeeMutation,
  useUploadEmployeePhotoMutation,
} from '@/features/organization/hooks/use-organization';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { useAttendanceSettingsQuery, useAssignEmployeeShiftMutation } from '@/features/attendance/hooks/use-attendance-settings';
import { useLeavePoliciesQuery } from '@/features/leave/hooks/use-leave';
import { checkJoiningDateConflict } from '@/features/attendance/utils/joining-date-check';
import { employeeCreateSchema, type EmployeeFormValues } from '../schemas/employee-form.schema';
import { CountryPhoneInput, DepartmentMultiSelect, SearchableSelect, ReportingManagerSelect } from '@/shared/ui';

function generateSecurePassword(length = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = uppercase + lowercase + numbers + symbols;

  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  const passwordChars = [
    uppercase[array[0] % uppercase.length],
    lowercase[array[1] % lowercase.length],
    numbers[array[2] % numbers.length],
    symbols[array[3] % symbols.length],
  ];

  for (let i = 4; i < length; i++) {
    passwordChars.push(all[array[i] % all.length]);
  }

  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'job'>('personal');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    emp_id: number;
    name: string;
    email: string;
  } | null>(null);

  // TanStack Queries
  const { data: deptOptions = [] } = useDepartmentOptionsQuery();
  const { data: managerOptions = [] } = useEmployeeOptionsQuery();
  const { data: genderLookups = [] } = useLookupsQuery('gender');
  const { data: employmentTypeLookups = [] } = useLookupsQuery('employment_type');
  const { data: bloodGroupLookups = [] } = useLookupsQuery('blood_group');
  const { data: leavePolicies = [] } = useLeavePoliciesQuery();
  const { data: attendanceSettings } = useAttendanceSettingsQuery();

  // Mutations
  const createMutation = useCreateEmployeeMutation();
  const uploadPhotoMutation = useUploadEmployeePhotoMutation();
  const assignShiftMutation = useAssignEmployeeShiftMutation();
  const [selectedShiftId, setSelectedShiftId] = useState<string>('default');

  const todayStr = new Date().toISOString().split('T')[0];
  const initialPassword = React.useMemo(() => generateSecurePassword(16), []);

  const form = useForm<EmployeeFormValues>({
    mode: 'onSubmit',
    resolver: zodResolver(employeeCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      personal_email: '',
      office_email: '',
      mob: '',
      gender_id: '' as unknown as number,
      emergency_contact_name: '',
      emergency_contact_number: '',
      emergency_contact_relation: '',
      birth_date: '',
      blood_group: '',
      address: '',
      dep_id: '' as unknown as number,
      department_ids: [],
      role_id: '' as unknown as number,
      reporting_manager: null,
      employment_type_id: '' as unknown as number,
      joining_date: todayStr,
      salary: 0,
      pf: 0,
      ot_eligible: false,
      ot_rate_type: 'MULTIPLIER',
      ot_rate: '' as any,
      ot_multiplier: 1.5,
      minimum_ot_per_day: 0,
      ot_paid_as: 'SALARY',
      pf_applicable: false,
      uan: '',
      employee_pf_pct: 12,
      employer_pf_pct: 12,
      payment_mode: 'BANK_TRANSFER',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      probation_period: '90 Days (3 Months)',
      notice_period: '30 Days',
      status: 'Active',
      password: initialPassword,
      confirm_password: initialPassword,
      must_change_password: false,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = form;

  const watchedDepIds = watch('department_ids') || [];
  const primaryDepId = watch('dep_id');
  const effectiveDepIds = watchedDepIds.length > 0 ? watchedDepIds : (primaryDepId ? [Number(primaryDepId)] : undefined);
  const { data: roleOptions = [] } = useRoleOptionsQuery(effectiveDepIds);
  const watchedPfApplicable = watch('pf_applicable');
  const watchedOtEligible = watch('ot_eligible');
  const watchedOtRateType = watch('ot_rate_type') || 'MULTIPLIER';
  const watchedJoiningDate = watch('joining_date');

  const joiningCheck = React.useMemo(() => {
    return checkJoiningDateConflict(watchedJoiningDate, attendanceSettings, selectedShiftId);
  }, [watchedJoiningDate, attendanceSettings, selectedShiftId]);

  const handleCopyEmail = () => {
    if (createdResult?.email) {
      navigator.clipboard.writeText(createdResult.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };


  const onSubmit = async (values: EmployeeFormValues) => {
    // If user submits while on personal tab, move to organization details tab
    if (activeTab === 'personal') {
      setActiveTab('job');
      return;
    }

    setGlobalError(null);
    try {
      const pDepId = Number(values.dep_id);
      const depIds = Array.from(new Set([pDepId, ...(values.department_ids || [])]));

      const createdEmp = await createMutation.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        personal_email: values.personal_email?.trim() || undefined,
        office_email: values.office_email?.trim() || values.email.trim().toLowerCase(),
        mob: values.mob?.trim() || undefined,
        password: values.password!,
        dep_id: pDepId,
        department_ids: depIds,
        role_id: values.role_id ? Number(values.role_id) : undefined,
        reporting_manager: values.reporting_manager ? Number(values.reporting_manager) : null,
        gender_id: values.gender_id ? Number(values.gender_id) : undefined,
        emergency_contact_name: values.emergency_contact_name?.trim() || undefined,
        emergency_contact_number: values.emergency_contact_number?.trim() || undefined,
        emergency_contact_relation: values.emergency_contact_relation?.trim() || undefined,
        birth_date: values.birth_date || undefined,
        blood_group: values.blood_group || undefined,
        address: values.address?.trim() || undefined,
        employment_type_id: values.employment_type_id ? Number(values.employment_type_id) : undefined,
        joining_date: values.joining_date,
        salary: Number(values.salary || 0),
        pf: Number(values.pf || 0),
        ot_eligible: Boolean(values.ot_eligible),
        ot_rate_type: values.ot_eligible ? (values.ot_rate_type || 'MULTIPLIER') : null,
        ot_rate: values.ot_eligible && values.ot_rate ? Number(values.ot_rate) : null,
        ot_multiplier: values.ot_eligible && values.ot_multiplier ? Number(values.ot_multiplier) : null,
        minimum_ot_per_day: Number(values.minimum_ot_per_day || 0),
        ot_paid_as: values.ot_paid_as || 'SALARY',
        pf_applicable: Boolean(values.pf_applicable),
        uan: values.uan?.trim() || null,
        employee_pf_pct: Number(values.employee_pf_pct || 12),
        employer_pf_pct: Number(values.employer_pf_pct || 12),
        payment_mode: values.payment_mode || null,
        bank_name: values.bank_name?.trim() || null,
        account_number: values.account_number?.trim() || null,
        ifsc_code: values.ifsc_code?.trim() || null,
        probation_period: values.probation_period?.trim() || null,
        notice_period: values.notice_period?.trim() || null,
      } as any);

      if (selectedPhotoFile && createdEmp.emp_id) {
        try {
          await uploadPhotoMutation.mutateAsync({
            id: createdEmp.emp_id,
            file: selectedPhotoFile,
          });
        } catch {
          // Photo upload optional
        }
      }

      const targetShiftId = selectedShiftId === 'default' ? null : parseInt(selectedShiftId, 10);
      if (createdEmp?.emp_id) {
        try {
          await assignShiftMutation.mutateAsync({ empId: createdEmp.emp_id, shiftId: targetShiftId });
        } catch {}
      }

      setCreatedResult({
        emp_id: createdEmp.emp_id,
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setGlobalError(err?.detail || err?.message || 'Failed to create employee. Please check inputs.');
    }
  };

  const handleClose = () => {
    reset();
    setCreatedResult(null);
    setPhotoPreview(null);
    setSelectedPhotoFile(null);
    setGlobalError(null);
    setActiveTab('personal');
    onClose();
  };

  if (!isOpen) return null;

  // Handover View on Success
  if (createdResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col space-y-4">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Employee Created Successfully!</h3>
            <p className="text-xs text-slate-500">
              Account created for <span className="font-semibold text-slate-800">{createdResult.name}</span>. Login activation details have been dispatched to their email:
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Employee Name:</span>
              <span className="font-bold text-slate-800">{createdResult.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Login Email:</span>
              <span className="font-mono font-bold text-slate-800 select-all">{createdResult.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">System Access:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <CheckCircle className="w-3 h-3 text-emerald-600" /> Auto-Generated & Emailed
              </span>
            </div>
            <p className="pt-1.5 text-[11px] text-slate-400 border-t border-slate-200/60 leading-relaxed">
              In accordance with security and privacy protocol (BFD Section 8), passwords are never shown to administrators. The employee will set their permanent password upon first login.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopyEmail}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {copiedEmail ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedEmail ? 'Copied Email' : 'Copy Login Email'}</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl h-[660px] max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header (Matching Reference Image) */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Add Employee</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill in employee details to create their profile and generate system credentials
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

        {/* Tab Navigation (Pill design) */}
        <div className="px-7 pt-3.5 pb-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'personal'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Personal Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('job')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'job'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Organization Details</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && activeTab !== 'job') {
              e.preventDefault();
              setActiveTab('job');
            }
          }}
          className="flex-1 overflow-y-auto p-7 space-y-5 custom-scrollbar"
        >
          {globalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-600 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL DETAILS (Reference Screen 1, Markers 1 - 11) */}
          {activeTab === 'personal' && (
            <div className="space-y-4.5 animate-in fade-in duration-150">
              {/* 1. Emp ID (Marker 1) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight flex items-center gap-1.5">
                    Emp ID
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </label>
                  <span className="text-[11px] text-slate-400">Filled by the system</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    readOnly
                    value="Auto-generated by system (e.g. EMP-0026)"
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-[13px] text-slate-500 font-mono cursor-not-allowed select-none"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* 2. Full Name (Marker 2) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">The name as it is on the Aadhaar Card.</span>
                </div>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="The name as it is on the Aadhaar Card"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                {errors.name && <p className="text-[11px] text-red-500 font-medium">{errors.name.message}</p>}
              </div>

              {/* 3. Gender (Marker 3) & 4. Phone Number (Marker 4) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Gender</label>
                    <span className="text-[11px] text-slate-400">Pick from Male, Female or Other</span>
                  </div>
                  <select
                    {...register('gender_id')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="">Select Gender</option>
                    {genderLookups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Phone Number</label>
                    <span className="text-[11px] text-slate-400">10-digit mobile (+91)</span>
                  </div>
                  <CountryPhoneInput
                    value={watch('mob') || ''}
                    onChange={(val) => setValue('mob', val, { shouldValidate: true, shouldDirty: true })}
                    placeholder="9876543210"
                    error={errors.mob?.message}
                  />
                </div>
              </div>

              {/* 5. Emergency Contact Name (Marker 5) & Relationship */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Emergency Contact Name</label>
                    <span className="text-[11px] text-slate-400">Who to call in an emergency</span>
                  </div>
                  <input
                    type="text"
                    {...register('emergency_contact_name')}
                    placeholder="Who to call in an emergency"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Relationship</label>
                  <input
                    type="text"
                    {...register('emergency_contact_relation')}
                    placeholder="How they are related (e.g. Father, Spouse)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* 6. Emergency Contact Number (Marker 6) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Emergency Contact Number</label>
                  <span className="text-[11px] text-slate-400">Mobile number of that person</span>
                </div>
                <CountryPhoneInput
                  value={watch('emergency_contact_number') || ''}
                  onChange={(val) =>
                    setValue('emergency_contact_number', val, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  placeholder="9876543210"
                  error={errors.emergency_contact_number?.message}
                />
              </div>

              {/* 7. Personal Email (Marker 7) & 8. Office Email (Marker 8) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Personal Email</label>
                    <span className="text-[11px] text-slate-400">Private email (post-exit use)</span>
                  </div>
                  <input
                    type="email"
                    {...register('personal_email')}
                    placeholder="personal@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {errors.personal_email && (
                    <p className="text-[11px] text-red-500 font-medium">{errors.personal_email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                      Office Email <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Login details go here</span>
                  </div>
                  <input
                    type="email"
                    {...register('email')}
                    onChange={(e) => {
                      setValue('email', e.target.value, { shouldValidate: true, shouldDirty: true });
                      setValue('office_email', e.target.value);
                    }}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {errors.email && <p className="text-[11px] text-red-500 font-medium">{errors.email.message}</p>}
                </div>
              </div>

              {/* 9. Birth Date (Marker 9) & 10. Blood Group (Marker 10) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Birth Date</label>
                    <span className="text-[11px] text-slate-400">Picked from calendar (18+)</span>
                  </div>
                  <input
                    type="date"
                    {...register('birth_date')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  />
                  {errors.birth_date && <p className="text-[11px] text-red-500 font-medium">{errors.birth_date.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Blood Group</label>
                    <span className="text-[11px] text-slate-400">Pick from list</span>
                  </div>
                  <select
                    {...register('blood_group')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="">Select Blood Group</option>
                    {bloodGroupLookups.map((bg) => (
                      <option key={bg.code} value={bg.code}>
                        {bg.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 11. Address (Marker 11) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Address</label>
                  <span className="text-[11px] text-slate-400">Full address in one box. Not compulsory.</span>
                </div>
                <textarea
                  rows={2}
                  {...register('address')}
                  placeholder="Full address in one box..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                />
              </div>

              {/* Profile Photo (Existing optional field) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Profile Photo</label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>
                <label className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-5 h-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">{selectedPhotoFile ? selectedPhotoFile.name : 'Choose photo (JPG/PNG)'}</span>
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: ORGANIZATION DETAILS */}
          {activeTab === 'job' && (
            <div className="space-y-4.5 animate-in fade-in duration-150">
              {/* Marker 1: Departments */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Departments <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Controls what the person sees in the CRM</span>
                </div>
                <DepartmentMultiSelect
                  departments={deptOptions}
                  selectedIds={watchedDepIds}
                  onChange={(ids) => {
                    setValue('department_ids', ids, { shouldValidate: true, shouldDirty: true });
                    setValue('dep_id', ids.length > 0 ? (ids[0] as any) : ('' as any), { shouldValidate: true });
                  }}
                  placeholder="Select Department(s)..."
                  error={errors.department_ids?.message}
                />
              </div>

              {/* Marker 2 & 3: Designation & Reporting Manager */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Marker 2: Designation */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                      Designation <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Pick from searchable list</span>
                  </div>
                  <SearchableSelect
                    options={roleOptions.map((r: any) => ({
                      value: r.role_id,
                      label: r.role_name || r.name,
                    }))}
                    value={watch('role_id')}
                    onChange={(val) =>
                      setValue('role_id', val ? Number(val) : ('' as any), {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    placeholder="Select Designation"
                    searchPlaceholder="Search designation..."
                    error={errors.role_id?.message}
                  />
                </div>

                {/* Marker 3: Reporting Manager */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Reporting Manager</label>
                    <span className="text-[11px] text-slate-400">Can be left empty</span>
                  </div>
                  <ReportingManagerSelect
                    options={managerOptions}
                    value={watch('reporting_manager')}
                    onChange={(val) =>
                      setValue('reporting_manager', val ? Number(val) : ('' as any), {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    placeholder="None / Self"
                    searchPlaceholder="Search by name or Emp ID..."
                    error={errors.reporting_manager?.message}
                  />
                </div>
              </div>

              {/* Marker 4 & 5: Employment Type & Joining Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Marker 4: Employment Type */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Employment Type</label>
                  <select
                    {...register('employment_type_id')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="">Full-time, Part-time, Intern or Contract</option>
                    {employmentTypeLookups.map((et) => (
                      <option key={et.id} value={et.id}>
                        {et.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Marker 5: Joining Date */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Joining Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('joining_date')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  />
                  {errors.joining_date && (
                    <p className="text-[11px] text-red-500 font-medium">{errors.joining_date.message}</p>
                  )}
                  {joiningCheck && joiningCheck.severity === 'warning' && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-1.5 text-xs text-amber-800 animate-in fade-in">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold">Notice: </span>
                        <span>{joiningCheck.message}</span>
                      </div>
                    </div>
                  )}
                  {joiningCheck && joiningCheck.severity === 'ok' && watchedJoiningDate && (
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{joiningCheck.message}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Marker 6 & 7: Salary & PF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Marker 6: Salary */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Salary</label>
                    <span className="text-[11px] text-slate-400">Monthly amount in ₹</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      {...register('salary')}
                      placeholder="0"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  {errors.salary && (
                    <p className="text-[11px] text-red-500 font-medium">{errors.salary.message}</p>
                  )}
                </div>

                {/* Marker 7: PF */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">PF</label>
                    <span className="text-[11px] text-slate-400">Monthly PF amount in ₹</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      {...register('pf')}
                      placeholder="0"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  {errors.pf && (
                    <p className="text-[11px] text-red-500 font-medium">{errors.pf.message}</p>
                  )}
                  <div className="flex items-center gap-4 pt-1">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        {...register('pf_applicable')}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>PF Applicable</span>
                    </label>
                    {watchedPfApplicable && (
                      <div className="flex-1">
                        <input
                          type="text"
                          {...register('uan')}
                          placeholder="12-digit UAN"
                          className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preserved: Probation Period & Notice Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Probation Period
                  </label>
                  <input
                    type="text"
                    list="add-probation-options"
                    {...register('probation_period')}
                    placeholder="e.g. 90 Days (3 Months)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <datalist id="add-probation-options">
                    <option value="None" />
                    <option value="30 Days" />
                    <option value="60 Days" />
                    <option value="90 Days (3 Months)" />
                    <option value="6 Months" />
                    <option value="1 Year" />
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Notice Period
                  </label>
                  <input
                    type="text"
                    list="add-notice-options"
                    {...register('notice_period')}
                    placeholder="e.g. 30 Days"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <datalist id="add-notice-options">
                    <option value="Immediate" />
                    <option value="15 Days" />
                    <option value="30 Days" />
                    <option value="60 Days" />
                    <option value="90 Days" />
                  </datalist>
                </div>
              </div>

              {/* Preserved: Assigned Shift & Leave Policy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Assigned Shift</label>
                  <select
                    value={selectedShiftId}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="default">Default Company Shift</option>
                    {attendanceSettings?.shifts?.map((s) => (
                      <option key={s.shift_id} value={String(s.shift_id)}>
                        {s.shift_name} ({s.start_time} - {s.end_time})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Leave Policy</label>
                  <select
                    {...register('leave_policy_id')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="">Default Leave Policy</option>
                    {leavePolicies.map((p) => (
                      <option key={p.policy_id} value={p.policy_id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preserved: Overtime Policy */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Overtime Policy</label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      {...register('ot_eligible')}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>OT Eligible</span>
                  </label>
                </div>

                {watchedOtEligible && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">OT Rate Calculation</label>
                        <select
                          {...register('ot_rate_type')}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        >
                          <option value="MULTIPLIER">Multiplier (e.g. 1.5x of hourly pay)</option>
                          <option value="FIXED">Fixed Hourly Rate (₹ per hour)</option>
                        </select>
                      </div>

                      {watchedOtRateType === 'FIXED' ? (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700">Hourly OT Rate (₹)</label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            {...register('ot_rate')}
                            placeholder="e.g. 250"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          />
                          {errors.ot_rate && <p className="text-[11px] text-red-500 font-medium">{errors.ot_rate.message}</p>}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700">OT Multiplier</label>
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            max="5"
                            {...register('ot_multiplier')}
                            placeholder="1.5"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          />
                          {errors.ot_multiplier && <p className="text-[11px] text-red-500 font-medium">{errors.ot_multiplier.message}</p>}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Daily Minimum OT Threshold (Mins)</label>
                        <input
                          type="number"
                          step="5"
                          min="0"
                          {...register('minimum_ot_per_day')}
                          placeholder="0 (e.g. 30 mins)"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                        <p className="text-[10px] text-slate-400">Minutes worked past shift before OT accumulates</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Disbursement Method</label>
                        <select
                          {...register('ot_paid_as')}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        >
                          <option value="SALARY">Direct Payroll Payout (₹)</option>
                          <option value="COMP_OFF">Compensatory Off (Leave)</option>
                        </select>
                        <p className="text-[10px] text-slate-400">Whether OT is paid or credited as comp-off leave</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preserved: Bank Account Details */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <h4 className="text-[13px] font-semibold text-slate-700 tracking-tight">Bank Account Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Bank Name</label>
                    <input
                      type="text"
                      {...register('bank_name')}
                      placeholder="e.g. HDFC Bank"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Account Number</label>
                    <input
                      type="text"
                      {...register('account_number')}
                      placeholder="e.g. 501002345678"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">IFSC Code</label>
                    <input
                      type="text"
                      {...register('ifsc_code')}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Preserved: System Temporary Password / Access */}
              <input type="hidden" {...register('password')} />
              <input type="hidden" {...register('confirm_password')} />

              <div className="pt-2 border-t border-slate-100">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-blue-100/80 shadow-xs space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                        System Temporary Password
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Automated
                        </span>
                      </h4>
                      <p className="text-[10.5px] text-slate-500">
                        Cryptographically generated for one-time employee activation
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80">
                    <div className="font-mono text-xs text-slate-400 tracking-widest pl-1 select-none">
                      ••••••••••••••••
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      Zero-Knowledge Protection
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer (Marker 8: "Cancel" leaves the form. "Save Employee" runs checks & creates) */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {activeTab === 'job' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('personal')}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition cursor-pointer"
                >
                  Previous
                </button>
              )}

              {activeTab === 'personal' ? (
                <button
                  key="btn-next-step"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab('job');
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Next: Organization Details
                </button>
              ) : (
                <button
                  key="btn-create-employee"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Employee</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
