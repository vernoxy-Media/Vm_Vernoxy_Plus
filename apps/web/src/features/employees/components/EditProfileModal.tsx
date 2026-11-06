import React, { useState, useEffect } from 'react';
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
  useUpdateEmployeeMutation,
  useUploadEmployeePhotoMutation,
} from '@/features/organization/hooks/use-organization';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import {
  useAttendanceSettingsQuery,
  useAssignEmployeeShiftMutation,
} from '@/features/attendance/hooks/use-attendance-settings';
import { checkJoiningDateConflict } from '@/features/attendance/utils/joining-date-check';
import { useLeavePoliciesQuery } from '@/features/leave/hooks/use-leave';
import {
  employeeEditSchema,
  type EmployeeEditFormValues,
} from '../schemas/employee-form.schema';
import { CountryPhoneInput, DepartmentMultiSelect, SearchableSelect, ReportingManagerSelect } from '@/shared/ui';
import { useAuth } from '@/features/auth/context/AuthContext';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSuccess,
  isAdmin,
}) => {
  const { user: currentUser, refreshProfile } = useAuth();
  const isOrgAdmin = isAdmin !== undefined ? isAdmin : Boolean(currentUser?.access?.can_manage_organization);
  const [activeTab, setActiveTab] = useState<'personal' | 'job'>('personal');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const formContainerRef = React.useRef<HTMLFormElement>(null);

  // TanStack Queries
  const { data: deptOptions = [] } = useDepartmentOptionsQuery();
  const { data: managerOptions = [] } = useEmployeeOptionsQuery();
  const { data: genderLookups = [] } = useLookupsQuery('gender');
  const { data: employmentTypeLookups = [] } = useLookupsQuery('employment_type');
  const { data: bloodGroupLookups = [] } = useLookupsQuery('blood_group');
  const { data: leavePolicies = [] } = useLeavePoliciesQuery();
  const { data: attendanceSettings } = useAttendanceSettingsQuery();

  const defaultEmploymentTypes = React.useMemo(() => [
    { id: 143, label: 'Full-time' },
    { id: 144, label: 'Part-time' },
    { id: 145, label: 'Intern' },
    { id: 146, label: 'Contract' },
  ], []);
  const effectiveEmploymentTypes = employmentTypeLookups.length > 0 ? employmentTypeLookups : defaultEmploymentTypes;

  // Mutations
  const updateMutation = useUpdateEmployeeMutation();
  const uploadPhotoMutation = useUploadEmployeePhotoMutation();
  const assignShiftMutation = useAssignEmployeeShiftMutation();
  const [selectedShiftId, setSelectedShiftId] = useState<string>('default');

  const todayStr = new Date().toISOString().split('T')[0];

  const form = useForm<EmployeeEditFormValues>({
    mode: 'onSubmit',
    resolver: zodResolver(employeeEditSchema),
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
      dep_id: 1,
      department_ids: [],
      role_id: '' as unknown as number,
      reporting_manager: null,
      employment_type_id: '' as unknown as number,
      joining_date: todayStr,
      salary: 0,
      pf: 0,
      ot_eligible: false,
      ot_rate_type: 'MULTIPLIER',
      ot_rate: '' as unknown as number,
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
      exit_date: '',
      status: 'Active',
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = form;

  const watchedDepIds = watch('department_ids') || [];
  const watchedPfApplicable = watch('pf_applicable');
  const watchedOtEligible = watch('ot_eligible');
  const watchedOtRateType = watch('ot_rate_type');
  const watchedJoiningDate = watch('joining_date');

  const joiningCheck = React.useMemo(() => {
    return checkJoiningDateConflict(watchedJoiningDate, attendanceSettings, selectedShiftId);
  }, [watchedJoiningDate, attendanceSettings, selectedShiftId]);

  // Filter roles based on selected departments
  const primaryDepId = watchedDepIds.length > 0 ? watchedDepIds[0] : undefined;
  const { data: roleOptions = [] } = useRoleOptionsQuery(primaryDepId);

  // Automatically scroll form to top when active tab changes
  useEffect(() => {
    if (formContainerRef.current) {
      formContainerRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Populate data when employee changes
  useEffect(() => {
    if (employee && isOpen) {
      const depIds =
        employee.departments && employee.departments.length > 0
          ? employee.departments.map((d: any) => d.id || d.dep_id)
          : employee.dep_id
          ? [employee.dep_id]
          : [];

      reset({
        name: employee.name || '',
        email: employee.email || '',
        personal_email: employee.personal_email || '',
        office_email: employee.office_email || '',
        mob: employee.mob || '',
        gender_id: employee.gender_id || ('' as any),
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_number: employee.emergency_contact_number || '',
        emergency_contact_relation: employee.emergency_contact_relation || '',
        birth_date: employee.birth_date ? new Date(employee.birth_date).toISOString().split('T')[0] : '',
        blood_group: employee.blood_group || '',
        address: employee.address || '',
        dep_id: employee.dep_id || depIds[0] || 1,
        department_ids: depIds,
        role_id: employee.role_id || ('' as any),
        reporting_manager: employee.reporting_manager || null,
        employment_type_id: employee.employment_type_id || ('' as any),
        joining_date: employee.joining_date
          ? new Date(employee.joining_date).toISOString().split('T')[0]
          : todayStr,
        salary: Number(employee.salary || 0),
        pf: Number(employee.pf || 0),
        ot_eligible: Boolean(employee.ot_eligible),
        ot_rate_type: employee.ot_rate_type || 'MULTIPLIER',
        ot_rate: employee.ot_rate ?? ('' as any),
        ot_multiplier: employee.ot_multiplier ?? 1.5,
        minimum_ot_per_day: employee.minimum_ot_per_day ?? 0,
        ot_paid_as: employee.ot_paid_as || 'SALARY',
        pf_applicable: Boolean(employee.pf_applicable),
        uan: employee.uan || '',
        employee_pf_pct: employee.employee_pf_pct ?? 12,
        employer_pf_pct: employee.employer_pf_pct ?? 12,
        payment_mode: employee.payment_mode || 'BANK_TRANSFER',
        bank_name: employee.bank_name || '',
        account_number: employee.account_number || '',
        ifsc_code: employee.ifsc_code || '',
        probation_period: employee.probation_period ?? '0',
        notice_period: employee.notice_period ?? '0',
        exit_date: employee.exit_date ? new Date(employee.exit_date).toISOString().split('T')[0] : '',
        status: employee.status || 'Active',
      });

      if (employee.photo_url) {
        setPhotoPreview(employee.photo_url);
      } else {
        setPhotoPreview(null);
      }

      const currentShift = attendanceSettings?.employee_shifts?.[String(employee.emp_id)];
      if (currentShift) {
        setSelectedShiftId(String(currentShift));
      } else {
        setSelectedShiftId('default');
      }

      setGlobalError(null);
      setSelectedPhotoFile(null);
      setShowConfirmLeave(false);
      setActiveTab('personal');
    }
  }, [employee, isOpen, reset, todayStr, attendanceSettings]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const requestClose = () => {
    if (form.formState.isDirty) {
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

  const onSubmit = async (values: EmployeeEditFormValues) => {
    if (!employee?.emp_id) return;

    // If on personal tab, validate and move to organization tab
    if (activeTab === 'personal') {
      const isValid = await trigger(['name', 'email']);
      if (isValid) {
        setActiveTab('job');
        if (formContainerRef.current) formContainerRef.current.scrollTop = 0;
      }
      return;
    }

    setGlobalError(null);

    const primaryDep = Number(values.dep_id) || (values.department_ids?.[0] ? Number(values.department_ids[0]) : 1);
    const departmentIds = Array.from(
      new Set([primaryDep, ...(values.department_ids || [])]),
    );

    const updatePayload: any = {
      name: values.name.trim(),
      personal_email: values.personal_email?.trim() || undefined,
      office_email: values.office_email?.trim() || undefined,
      mob: values.mob?.trim() || undefined,
      gender_id: values.gender_id ? Number(values.gender_id) : null,
      emergency_contact_name: values.emergency_contact_name?.trim() || undefined,
      emergency_contact_number: values.emergency_contact_number?.trim() || undefined,
      emergency_contact_relation: values.emergency_contact_relation?.trim() || undefined,
      birth_date: values.birth_date || null,
      blood_group: values.blood_group || undefined,
      address: values.address?.trim() || undefined,
    };

    if (isOrgAdmin) {
      updatePayload.dep_id = primaryDep;
      updatePayload.department_ids = departmentIds;
      updatePayload.role_id = values.role_id ? Number(values.role_id) : null;
      updatePayload.reporting_manager = values.reporting_manager ? Number(values.reporting_manager) : null;
      updatePayload.leave_policy_id = values.leave_policy_id ? Number(values.leave_policy_id) : undefined;
      updatePayload.employment_type_id = values.employment_type_id ? Number(values.employment_type_id) : null;
      updatePayload.joining_date = values.joining_date;
      updatePayload.salary = Number(values.salary || 0);
      updatePayload.pf = Number(values.pf || 0);
      updatePayload.ot_eligible = Boolean(values.ot_eligible);
      updatePayload.ot_rate_type = values.ot_eligible ? (values.ot_rate_type || 'MULTIPLIER') : null;
      updatePayload.ot_rate =
        values.ot_eligible && values.ot_rate !== undefined && values.ot_rate !== null && values.ot_rate !== ('' as any)
          ? Number(values.ot_rate)
          : null;
      updatePayload.ot_multiplier =
        values.ot_eligible && values.ot_multiplier !== undefined && values.ot_multiplier !== null && values.ot_multiplier !== ('' as any)
          ? Number(values.ot_multiplier)
          : null;
      updatePayload.minimum_ot_per_day = Number(values.minimum_ot_per_day || 0);
      updatePayload.ot_paid_as = values.ot_paid_as || 'SALARY';
      updatePayload.pf_applicable = Boolean(values.pf_applicable);
      updatePayload.uan = values.uan?.trim() || null;
      updatePayload.employee_pf_pct = Number(values.employee_pf_pct || 12);
      updatePayload.employer_pf_pct = Number(values.employer_pf_pct || 12);
      updatePayload.payment_mode = values.payment_mode || null;
      updatePayload.bank_name = values.bank_name?.trim() || null;
      updatePayload.account_number = values.account_number?.trim() || null;
      updatePayload.ifsc_code = values.ifsc_code?.trim() || null;
      updatePayload.probation_period = values.probation_period?.trim() || null;
      updatePayload.notice_period = values.notice_period?.trim() || null;
      updatePayload.exit_date = values.exit_date || employee.exit_date || null;
      updatePayload.status = values.status || employee.status || 'Active';
    }

    try {
      await updateMutation.mutateAsync({
        id: employee.emp_id,
        data: updatePayload,
      });

      // Photo upload if selected
      if (selectedPhotoFile) {
        try {
          await uploadPhotoMutation.mutateAsync({
            id: employee.emp_id,
            file: selectedPhotoFile,
          });
        } catch (photoErr) {
          console.warn('Photo upload failed:', photoErr);
        }
      }

      // Shift assignment sync (admin only)
      if (isOrgAdmin) {
        const targetShiftId = selectedShiftId === 'default' ? null : parseInt(selectedShiftId, 10);
        try {
          await assignShiftMutation.mutateAsync({ empId: employee.emp_id, shiftId: targetShiftId });
        } catch (shiftErr) {
          console.warn('Shift sync failed:', shiftErr);
        }
      }

      if (currentUser?.emp_id === employee.emp_id) {
        await refreshProfile();
      }

      handleForceClose();
      onSuccess?.();
    } catch (err: any) {
      setGlobalError(err?.detail || err?.message || 'Failed to update employee. Please check inputs.');
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[720px] max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Employee</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update employee profile details, assignments, compensation, and service terms
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

        {/* Tab Navigation (Pill design matching Add Employee) */}
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
            {!isOrgAdmin && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === 'job' ? 'bg-blue-700/80 text-blue-100' : 'bg-slate-200/80 text-slate-500'
              }`}>
                <Lock className="w-2.5 h-2.5" /> Locked
              </span>
            )}
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
                        value={employee.emp_code || (employee.emp_id ? `EMP-${String(employee.emp_id).padStart(4, '0')}` : '')}
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-mono cursor-not-allowed select-all"
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
                      onChange={(val) => setValue('mob', val, { shouldValidate: true, shouldDirty: true })}
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
                      {...register('office_email')}
                      placeholder="name@company.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    {errors.office_email && (
                      <p className="text-[11px] text-red-500 font-medium">{errors.office_email.message}</p>
                    )}
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
                        <option key={bg.id} value={bg.label}>
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
              {/* Employee Warning Banner when fields are locked */}
              {!isOrgAdmin && (
                <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-start gap-3 shadow-2xs animate-in fade-in">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      Organization Information Locked
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Placement, compensation, statutory details, policies, and service terms are managed by Administrators and HR. These fields are read-only for employees. Contact HR or your administrator to request updates.
                    </p>
                  </div>
                </div>
              )}
              {/* SECTION 1: ORGANIZATIONAL ROLE & DEPARTMENT */}
              <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Placement & Role</h3>
                  {!isOrgAdmin && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md font-semibold">
                      <Lock className="w-2.5 h-2.5" /> Read-Only
                    </span>
                  )}
                </div>

                {/* Department MultiSelect */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Department(s)</label>
                  <DepartmentMultiSelect
                    departments={deptOptions}
                    selectedIds={watchedDepIds}
                    disabled={!isOrgAdmin}
                    onChange={(ids) => {
                      if (!isOrgAdmin) return;
                      setValue('department_ids', ids, { shouldValidate: true, shouldDirty: true });
                      setValue('dep_id', ids[0] || 1, { shouldValidate: true, shouldDirty: true });
                    }}
                    placeholder="Select Department(s)..."
                    error={errors.department_ids?.message}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Designation */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Designation</label>
                    <SearchableSelect
                      options={roleOptions.map((r: any) => ({
                        value: r.role_id,
                        label: r.role_name || r.name,
                      }))}
                      value={watch('role_id')}
                      disabled={!isOrgAdmin}
                      onChange={(val) => {
                        if (!isOrgAdmin) return;
                        setValue('role_id', val ? Number(val) : ('' as any), {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }}
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
                      disabled={!isOrgAdmin}
                      onChange={(val) => {
                        if (!isOrgAdmin) return;
                        setValue('reporting_manager', val ? Number(val) : (null as any), {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }}
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
                      disabled={!isOrgAdmin}
                      className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden transition ${
                        !isOrgAdmin
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                          : 'bg-white text-slate-800 cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
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
                      disabled={!isOrgAdmin}
                      onChange={(e) => setSelectedShiftId(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden transition ${
                        !isOrgAdmin
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                          : 'bg-white text-slate-800 cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
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
                  {!isOrgAdmin && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md font-semibold">
                      <Lock className="w-2.5 h-2.5" /> Read-Only
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Joining Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Joining Date</label>
                    <input
                      type="date"
                      {...register('joining_date')}
                      disabled={!isOrgAdmin}
                      className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden transition ${
                        !isOrgAdmin
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                          : 'bg-white text-slate-900 cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    />
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
                      disabled={!isOrgAdmin}
                      className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden transition ${
                        !isOrgAdmin
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                          : 'bg-white text-slate-800 cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    >
                      <option value="">Default Leave Policy</option>
                      {leavePolicies.map((lp) => (
                        <option key={lp.policy_id} value={lp.policy_id}>
                          {lp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Probation Period */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Probation Period</label>
                    <input
                      type="text"
                      list="edit-probation-options"
                      {...register('probation_period')}
                      disabled={!isOrgAdmin}
                      placeholder="0"
                      className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden transition ${
                        !isOrgAdmin
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                          : 'bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    />
                    <datalist id="edit-probation-options">
                      <option value="0" />
                      <option value="None" />
                      <option value="30 Days" />
                      <option value="60 Days" />
                      <option value="90 Days (3 Months)" />
                      <option value="6 Months" />
                      <option value="1 Year" />
                    </datalist>
                  </div>

                  {/* Notice Period */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Notice Period</label>
                    <input
                      type="text"
                      list="edit-notice-options"
                      {...register('notice_period')}
                      disabled={!isOrgAdmin}
                      placeholder="0"
                      className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden transition ${
                        !isOrgAdmin
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                          : 'bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    />
                    <datalist id="edit-notice-options">
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
                  {!isOrgAdmin && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md font-semibold">
                      <Lock className="w-2.5 h-2.5" /> Read-Only
                    </span>
                  )}
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
                        disabled={!isOrgAdmin}
                        placeholder="0"
                        className={`w-full pl-8 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden transition ${
                          !isOrgAdmin
                            ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                            : 'bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                        }`}
                      />
                    </div>
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
                        disabled={!isOrgAdmin}
                        placeholder="0"
                        className={`w-full pl-8 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden transition ${
                          !isOrgAdmin
                            ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                            : 'bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-4 pt-1">
                      <label className={`inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 ${!isOrgAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          {...register('pf_applicable')}
                          disabled={!isOrgAdmin}
                          className={`rounded text-blue-600 focus:ring-blue-500 ${!isOrgAdmin ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        />
                        <span>PF Applicable</span>
                      </label>
                      {watchedPfApplicable && (
                        <div className="flex-1">
                          <input
                            type="text"
                            {...register('uan')}
                            disabled={!isOrgAdmin}
                            placeholder="12-digit UAN"
                            className={`w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-hidden ${
                              !isOrgAdmin
                                ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                                : 'bg-white text-slate-900 focus:border-blue-500'
                            }`}
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
                    <label className={`inline-flex items-center gap-2 text-xs font-semibold text-slate-700 ${!isOrgAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        {...register('ot_eligible')}
                        disabled={!isOrgAdmin}
                        className={`rounded text-blue-600 focus:ring-blue-500 ${!isOrgAdmin ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
                            disabled={!isOrgAdmin}
                            className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden transition ${
                              !isOrgAdmin
                                ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                                : 'bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                            }`}
                          >
                            <option value="MULTIPLIER">Multiplier (e.g. 1.5x of hourly rate)</option>
                            <option value="FIXED">Fixed Hourly Rate (₹ / hour)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700">
                            {watchedOtRateType === 'FIXED' ? 'Hourly Rate (₹)' : 'Multiplier Value'}
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            {...register(watchedOtRateType === 'FIXED' ? 'ot_rate' : 'ot_multiplier')}
                            disabled={!isOrgAdmin}
                            placeholder={watchedOtRateType === 'FIXED' ? 'e.g. 150' : 'e.g. 1.5'}
                            className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden transition ${
                              !isOrgAdmin
                                ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                                : 'bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                            }`}
                          />
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
                  {!isOrgAdmin && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md font-semibold">
                      <Lock className="w-2.5 h-2.5" /> Read-Only
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Bank Name</label>
                    <input
                      type="text"
                      {...register('bank_name')}
                      disabled={!isOrgAdmin}
                      placeholder="e.g. HDFC Bank"
                      className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden transition ${
                        !isOrgAdmin
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                          : 'bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Account Number</label>
                    <input
                      type="text"
                      {...register('account_number')}
                      disabled={!isOrgAdmin}
                      placeholder="e.g. 501002345678"
                      className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden transition ${
                        !isOrgAdmin
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                          : 'bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">IFSC Code</label>
                    <input
                      type="text"
                      {...register('ifsc_code')}
                      disabled={!isOrgAdmin}
                      placeholder="e.g. HDFC0001234"
                      className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden transition ${
                        !isOrgAdmin
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                          : 'bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: EMPLOYMENT STATUS & LIFECYCLE */}
              <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Status & Lifecycle</h3>
                  {!isOrgAdmin && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md font-semibold">
                      <Lock className="w-2.5 h-2.5" /> Read-Only
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Status</label>
                    <select
                      {...register('status')}
                      disabled={!isOrgAdmin}
                      className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden transition ${
                        !isOrgAdmin
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                          : 'bg-white text-slate-800 cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Terminated">Terminated</option>
                      <option value="Resigned">Resigned</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Exit Date (if applicable)</label>
                    <input
                      type="date"
                      {...register('exit_date')}
                      disabled={!isOrgAdmin}
                      className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden transition ${
                        !isOrgAdmin
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-none'
                          : 'bg-white text-slate-900 cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>
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
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isValid = await trigger(['name', 'email']);
                    if (isValid) {
                      setActiveTab('job');
                      if (formContainerRef.current) formContainerRef.current.scrollTop = 0;
                    }
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Next: Organization Details
                </button>
              ) : (
                <button
                  key="btn-save-employee"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Changes</span>
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
    </div>
  );
};
