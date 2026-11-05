import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  Check,
  User,
  Building2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Lock,
  Upload,
  Camera,
  HeartHandshake,
  Calendar,
  CreditCard,
  Briefcase,
  Landmark,
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
import { SetPasswordLinkField } from './SetPasswordLinkField';
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
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const formContainerRef = React.useRef<HTMLFormElement>(null);

  // Automatically scroll form to top when active tab changes
  React.useEffect(() => {
    if (formContainerRef.current) {
      formContainerRef.current.scrollTop = 0;
    }
  }, [activeTab]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{ name: string; code?: string } | null>(null);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // TanStack Queries
  const { data: deptOptions = [] } = useDepartmentOptionsQuery();
  const { data: managerOptions = [] } = useEmployeeOptionsQuery();
  const { data: genderLookups = [] } = useLookupsQuery('gender');
  const { data: employmentTypeLookups = [] } = useLookupsQuery('employment_type');
  const defaultEmploymentTypes = React.useMemo(() => [
    { id: 143, label: 'Full-time' },
    { id: 144, label: 'Part-time' },
    { id: 145, label: 'Intern' },
    { id: 146, label: 'Contract' },
  ], []);
  const effectiveEmploymentTypes = employmentTypeLookups.length > 0 ? employmentTypeLookups : defaultEmploymentTypes;
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
      probation_period: '0',
      notice_period: '0',
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

      // Upload photo if selected
      if (selectedPhotoFile && createdEmp?.emp_id) {
        try {
          await uploadPhotoMutation.mutateAsync({
            id: createdEmp.emp_id,
            file: selectedPhotoFile,
          });
        } catch (photoErr) {
          console.warn('Photo upload failed after employee creation:', photoErr);
        }
      }

      // Assign non-default shift if selected
      const targetShiftId = selectedShiftId === 'default' ? null : parseInt(selectedShiftId, 10);
      if (createdEmp?.emp_id) {
        try {
          await assignShiftMutation.mutateAsync({ empId: createdEmp.emp_id, shiftId: targetShiftId });
        } catch (shiftErr) {
          console.warn('Shift assignment failed:', shiftErr);
        }
      }

      const empCode = (createdEmp as any)?.emp_code || (createdEmp?.emp_id ? `EMP-${String(createdEmp.emp_id).padStart(4, '0')}` : '');
      setSuccessToast({
        name: createdEmp?.name || values.name,
        code: empCode,
      });
      handleForceClose();
      onSuccess?.();
    } catch (err: any) {
      setGlobalError(err?.message || 'Failed to create employee profile. Please check the values and try again.');
    }
  };

  const requestClose = () => {
    const isDirty = form.formState.isDirty || Boolean(form.getValues('name') || form.getValues('email') || form.getValues('mob'));
    if (isDirty) {
      setShowConfirmLeave(true);
    } else {
      handleForceClose();
    }
  };

  const handleForceClose = () => {
    setShowConfirmLeave(false);
    reset();
    setPhotoPreview(null);
    setSelectedPhotoFile(null);
    setGlobalError(null);
    setActiveTab('personal');
    onClose();
  };

  if (!isOpen && !successToast) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[720px] max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Add Employee</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill in employee details to create their profile and generate system credentials
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Pill design) */}
        <div className="px-7 pt-3.5 pb-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('personal');
              if (formContainerRef.current) formContainerRef.current.scrollTop = 0;
            }}
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
            onClick={() => {
              setActiveTab('job');
              if (formContainerRef.current) formContainerRef.current.scrollTop = 0;
            }}
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
          ref={formContainerRef}
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && activeTab !== 'job') {
              e.preventDefault();
              setActiveTab('job');
              if (formContainerRef.current) formContainerRef.current.scrollTop = 0;
            }
          }}
          className="flex-1 overflow-y-auto p-7 space-y-6 custom-scrollbar"
        >
          {globalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-600 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL DETAILS */}
          {activeTab === 'personal' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Profile Photo at top */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 bg-white overflow-hidden flex items-center justify-center shadow-xs">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Profile Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-9 h-9 text-slate-300" />
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer">
                    <Camera className="w-5 h-5" />
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                  </label>
                </div>
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">Profile Photo</h4>
                  <p className="text-[11px] text-slate-400">
                    Upload employee portrait photo (JPG, PNG). Recommended size 400x400px.
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-1 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedPhotoFile ? selectedPhotoFile.name : photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Basic Information: Emp ID & Full Name & Gender & Phone */}
              <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Marker 1: Emp ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      Emp ID
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        readOnly
                        value="Auto-generated by system (e.g. EMP-0026)"
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-mono cursor-not-allowed select-none"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Marker 2: Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('name')}
                      placeholder="The name as it is on the Aadhaar Card"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    {errors.name && <p className="text-[11px] text-red-500 font-medium">{errors.name.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Marker 3: Gender */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Gender</label>
                    <select
                      {...register('gender_id')}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                    >
                      <option value="">Select Gender</option>
                      {genderLookups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Marker 4: Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                    <CountryPhoneInput
                      value={watch('mob') || ''}
                      onChange={(val) => {
                        setValue('mob', val, { shouldValidate: true, shouldDirty: true });
                      }}
                      placeholder="9876543210"
                      error={errors.mob?.message}
                    />
                  </div>
                </div>
              </div>

              {/* Marker 5 & 6: Emergency Contact */}
              <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60">
                  <HeartHandshake className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Emergency Contact</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Marker 5: Emergency Contact Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Emergency Contact Name</label>
                    <input
                      type="text"
                      {...register('emergency_contact_name')}
                      placeholder="Who to call in an emergency"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  {/* Relationship */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Relationship</label>
                    <input
                      type="text"
                      {...register('emergency_contact_relation')}
                      placeholder="How they are related (e.g. Father, Spouse)"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Marker 6: Emergency Contact Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Emergency Contact Number</label>
                  <CountryPhoneInput
                    value={watch('emergency_contact_number') || ''}
                    onChange={(val) => {
                      setValue('emergency_contact_number', val, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                    placeholder="9876543210"
                    error={errors.emergency_contact_number?.message}
                  />
                </div>
              </div>

              {/* Marker 7, 8, 9, 10, 11: Personal & Office Info */}
              <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Marker 7: Personal Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Personal Email</label>
                    <input
                      type="email"
                      {...register('personal_email')}
                      placeholder="personal@gmail.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    {errors.personal_email && (
                      <p className="text-[11px] text-red-500 font-medium">{errors.personal_email.message}</p>
                    )}
                  </div>

                  {/* Marker 8: Office Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Office Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      {...register('email')}
                      onChange={(e) => {
                        setValue('email', e.target.value, { shouldValidate: true, shouldDirty: true });
                        setValue('office_email', e.target.value);
                      }}
                      placeholder="name@company.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    {errors.email && <p className="text-[11px] text-red-500 font-medium">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Marker 9: Birth Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Birth Date</label>
                    <input
                      type="date"
                      {...register('birth_date')}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                    />
                    {errors.birth_date && <p className="text-[11px] text-red-500 font-medium">{errors.birth_date.message}</p>}
                  </div>

                  {/* Marker 10: Blood Group */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Blood Group</label>
                    <select
                      {...register('blood_group')}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
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

                {/* Marker 11: Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Residential Address</label>
                  <textarea
                    rows={2}
                    {...register('address')}
                    placeholder="Full residential address in one box..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORGANIZATION DETAILS */}
          {activeTab === 'job' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* SECTION 1: ROLE & PLACEMENT */}
              <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Role & Placement</h3>
                </div>

                {/* Departments */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Departments <span className="text-red-500">*</span>
                  </label>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Designation */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Designation <span className="text-red-500">*</span>
                    </label>
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

                  {/* Reporting Manager */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Reporting Manager</label>
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

                  {/* Employment Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Employment Type</label>
                    <select
                      {...register('employment_type_id')}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                    >
                      <option value="">Select Employment Type</option>
                      {effectiveEmploymentTypes.map((et) => (
                        <option key={et.id} value={et.id}>
                          {et.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assigned Shift */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Assigned Shift</label>
                    <select
                      value={selectedShiftId}
                      onChange={(e) => setSelectedShiftId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                    >
                      <option value="default">Default Company Shift</option>
                      {attendanceSettings?.shifts?.map((s) => (
                        <option key={s.shift_id} value={String(s.shift_id)}>
                          {s.shift_name} ({s.start_time} - {s.end_time})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: JOINING & SERVICE TERMS */}
              <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Joining & Service Terms</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Joining Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Joining Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      {...register('joining_date')}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
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
                  </div>

                  {/* Leave Policy */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Leave Policy</label>
                    <select
                      {...register('leave_policy_id')}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Probation Period (defaults to 0) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Probation Period</label>
                    <input
                      type="text"
                      list="add-probation-options"
                      {...register('probation_period')}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    <datalist id="add-probation-options">
                      <option value="0" />
                      <option value="None" />
                      <option value="30 Days" />
                      <option value="60 Days" />
                      <option value="90 Days (3 Months)" />
                      <option value="6 Months" />
                      <option value="1 Year" />
                    </datalist>
                  </div>

                  {/* Notice Period (defaults to 0) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Notice Period</label>
                    <input
                      type="text"
                      list="add-notice-options"
                      {...register('notice_period')}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    <datalist id="add-notice-options">
                      <option value="0" />
                      <option value="Immediate" />
                      <option value="15 Days" />
                      <option value="30 Days" />
                      <option value="60 Days" />
                      <option value="90 Days" />
                    </datalist>
                  </div>
                </div>
              </div>

              {/* SECTION 3: COMPENSATION & STATUTORY */}
              <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Compensation & Statutory</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Salary */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Salary (Monthly ₹)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">₹</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        {...register('salary')}
                        placeholder="0"
                        className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                    </div>
                    {errors.salary && (
                      <p className="text-[11px] text-red-500 font-medium">{errors.salary.message}</p>
                    )}
                  </div>

                  {/* PF */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">PF (Monthly ₹)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">₹</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        {...register('pf')}
                        placeholder="0"
                        className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
                            className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overtime Policy */}
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Overtime Policy</label>
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
                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700">OT Rate Calculation</label>
                          <select
                            {...register('ot_rate_type')}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          />
                          <p className="text-[10px] text-slate-400">Minutes worked past shift before OT accumulates</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700">Disbursement Method</label>
                          <select
                            {...register('ot_paid_as')}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
              </div>

              {/* SECTION 4: BANK ACCOUNT DETAILS */}
              <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60">
                  <Landmark className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Bank Account Details</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Bank Name</label>
                    <input
                      type="text"
                      {...register('bank_name')}
                      placeholder="e.g. HDFC Bank"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Account Number</label>
                    <input
                      type="text"
                      {...register('account_number')}
                      placeholder="e.g. 501002345678"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">IFSC Code</label>
                    <input
                      type="text"
                      {...register('ifsc_code')}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: SYSTEM ACCESS & SECURITY */}
              <input type="hidden" {...register('password')} />
              <input type="hidden" {...register('confirm_password')} />

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-100/90 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                      Set Password Link
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Automated
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Share this link with the employee. It opens the Set Password page; after setting a password they sign in with access as per their role. The same link is emailed to them.
                    </p>
                  </div>
                </div>

                <SetPasswordLinkField officeEmail={watch('office_email') || watch('email')} />
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={requestClose}
              className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {activeTab === 'job' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('personal');
                    if (formContainerRef.current) formContainerRef.current.scrollTop = 0;
                  }}
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
                    if (formContainerRef.current) formContainerRef.current.scrollTop = 0;
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

      {/* Confirmation Modal when Leaving with Unsaved Changes */}
      {showConfirmLeave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Leave this page?</h3>
                <p className="text-xs text-slate-500 mt-1">The details you typed will be lost.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmLeave(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={handleForceClose}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast Pop-up */}
      {successToast &&
        createPortal(
          <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-4 duration-300">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 border-l-[5px] border-l-emerald-600 p-4 flex items-center gap-3.5 min-w-[320px] max-w-md">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 leading-tight">Employee added</h4>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {successToast.name} {successToast.code ? `(${successToast.code})` : ''} is now Active.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSuccessToast(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
