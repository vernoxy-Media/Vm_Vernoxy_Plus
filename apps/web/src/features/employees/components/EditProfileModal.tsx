import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  User,
  Building2,
  Landmark,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Upload,
  CheckCircle,
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
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSuccess,
}) => {
  const { user: currentUser, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'job' | 'salary' | 'security'>('personal');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // TanStack Queries
  const { data: deptOptions = [] } = useDepartmentOptionsQuery();
  const { data: managerOptions = [] } = useEmployeeOptionsQuery();
  const { data: genderLookups = [] } = useLookupsQuery('gender');
  const { data: employmentTypeLookups = [] } = useLookupsQuery('employment_type');
  const { data: bloodGroupLookups = [] } = useLookupsQuery('blood_group');
  const { data: leavePolicies = [] } = useLeavePoliciesQuery();
  const { data: attendanceSettings } = useAttendanceSettingsQuery();

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
      status: 'Active',
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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

  // Populate data when employee changes
  useEffect(() => {
    if (employee && isOpen) {
      const assignedDepIds =
        employee.departments && employee.departments.length > 0
          ? employee.departments.map((d: any) => d.dep_id)
          : employee.dep_id
          ? [employee.dep_id]
          : [];

      reset({
        name: employee.name || '',
        email: employee.email || '',
        personal_email: employee.personal_email || '',
        office_email: employee.office_email || employee.email || '',
        mob: employee.mob || '',
        gender_id: employee.gender_id ?? ('' as any),
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_number: employee.emergency_contact_number || '',
        emergency_contact_relation: employee.emergency_contact_relation || '',
        birth_date: employee.birth_date
          ? new Date(employee.birth_date).toISOString().split('T')[0]
          : '',
        blood_group: employee.blood_group || '',
        address: employee.address || '',
        dep_id: employee.dep_id || (assignedDepIds[0] ?? 1),
        department_ids: assignedDepIds,
        role_id: employee.role_id ?? ('' as any),
        reporting_manager: employee.reporting_manager ?? null,
        leave_policy_id: employee.leave_policy_id ?? ('' as any),
        employment_type_id: employee.employment_type_id ?? ('' as any),
        joining_date: employee.joining_date
          ? new Date(employee.joining_date).toISOString().split('T')[0]
          : todayStr,
        salary: employee.salary ? Number(employee.salary) : 0,
        pf: employee.pf ? Number(employee.pf) : 0,
        ot_eligible: Boolean(employee.ot_eligible ?? employee.pay_policy?.ot_eligible),
        ot_rate_type: (employee.ot_rate_type ?? employee.pay_policy?.ot_rate_type) || 'MULTIPLIER',
        ot_rate: (employee.ot_rate ?? employee.pay_policy?.ot_rate) ?? ('' as any),
        ot_multiplier: Number(employee.ot_multiplier ?? employee.pay_policy?.ot_multiplier ?? 1.5),
        minimum_ot_per_day: Number(employee.minimum_ot_per_day ?? employee.pay_policy?.minimum_ot_per_day ?? 0),
        ot_paid_as: (employee.ot_paid_as ?? employee.pay_policy?.ot_paid_as) || 'SALARY',
        pf_applicable: Boolean(employee.pf_applicable ?? employee.pay_policy?.pf_applicable ?? (Number(employee.pf) > 0)),
        uan: (employee.uan ?? employee.pay_policy?.uan) || '',
        employee_pf_pct: Number(employee.employee_pf_pct ?? employee.pay_policy?.employee_pf_pct ?? 12),
        employer_pf_pct: Number(employee.employer_pf_pct ?? employee.pay_policy?.employer_pf_pct ?? 12),
        payment_mode: (employee.payment_mode ?? employee.pay_policy?.payment_mode) || 'BANK_TRANSFER',
        bank_name: (employee.bank_name ?? employee.pay_policy?.bank_name) || '',
        account_number: (employee.account_number ?? employee.pay_policy?.account_number) || '',
        ifsc_code: (employee.ifsc_code ?? employee.pay_policy?.ifsc_code) || '',
        probation_period: employee.probation_period || '90 Days (3 Months)',
        notice_period: employee.notice_period || '30 Days',
        exit_date: employee.exit_date
          ? new Date(employee.exit_date).toISOString().split('T')[0]
          : '',
        status: employee.status || 'Active',
      });

      if (employee.profile_picture_url) {
        setPhotoPreview(employee.profile_picture_url);
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
      setSuccessMessage(null);
      setSelectedPhotoFile(null);
    }
  }, [employee, isOpen, reset, todayStr, attendanceSettings]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleClose = () => {
    reset();
    setPhotoPreview(null);
    setSelectedPhotoFile(null);
    setGlobalError(null);
    setSuccessMessage(null);
    setActiveTab('personal');
    onClose();
  };

  const onSubmit = async (values: EmployeeEditFormValues) => {
    if (!employee?.emp_id) return;

    // Prevent premature submission before reaching the final Emergency & Access tab
    if (activeTab !== 'security') {
      if (activeTab === 'personal') setActiveTab('job');
      else if (activeTab === 'job') setActiveTab('salary');
      else if (activeTab === 'salary') setActiveTab('security');
      return;
    }

    setGlobalError(null);
    setSuccessMessage(null);

    const primaryDep = Number(values.dep_id) || (values.department_ids?.[0] ? Number(values.department_ids[0]) : 1);
    const departmentIds = Array.from(
      new Set([primaryDep, ...(values.department_ids || [])]),
    );

    try {
      await updateMutation.mutateAsync({
        id: employee.emp_id,
        data: {
          name: values.name.trim(),
          personal_email: values.personal_email?.trim() || undefined,
          office_email: values.office_email?.trim() || undefined,
          mob: values.mob?.trim() || undefined,
          dep_id: primaryDep,
          department_ids: departmentIds,
          role_id: values.role_id ? Number(values.role_id) : null,
          reporting_manager: values.reporting_manager ? Number(values.reporting_manager) : null,
          gender_id: values.gender_id ? Number(values.gender_id) : null,
          emergency_contact_name: values.emergency_contact_name?.trim() || undefined,
          emergency_contact_number: values.emergency_contact_number?.trim() || undefined,
          emergency_contact_relation: values.emergency_contact_relation?.trim() || undefined,
          birth_date: values.birth_date || null,
          blood_group: values.blood_group || undefined,
          address: values.address?.trim() || undefined,
          leave_policy_id: values.leave_policy_id ? Number(values.leave_policy_id) : undefined,
          employment_type_id: values.employment_type_id ? Number(values.employment_type_id) : null,
          joining_date: values.joining_date,
          salary: Number(values.salary || 0),
          pf: Number(values.pf || 0),
          ot_eligible: Boolean(values.ot_eligible),
          ot_rate_type: values.ot_eligible ? (values.ot_rate_type || 'MULTIPLIER') : null,
          ot_rate:
            values.ot_eligible && values.ot_rate !== undefined && values.ot_rate !== null && values.ot_rate !== ('' as any)
              ? Number(values.ot_rate)
              : null,
          ot_multiplier:
            values.ot_eligible && values.ot_multiplier !== undefined && values.ot_multiplier !== null && values.ot_multiplier !== ('' as any)
              ? Number(values.ot_multiplier)
              : null,
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
          exit_date: values.exit_date || employee.exit_date || null,
          status: values.status || employee.status || 'Active',
        } as any,
      });

      // Photo upload if selected
      if (selectedPhotoFile) {
        try {
          await uploadPhotoMutation.mutateAsync({
            id: employee.emp_id,
            file: selectedPhotoFile,
          });
        } catch {
          // Photo upload optional
        }
      }

      // Shift assignment sync
      const targetShiftId = selectedShiftId === 'default' ? null : parseInt(selectedShiftId, 10);
      try {
        await assignShiftMutation.mutateAsync({ empId: employee.emp_id, shiftId: targetShiftId });
      } catch {}

      if (currentUser?.emp_id === employee.emp_id) {
        await refreshProfile();
      }

      setSuccessMessage('Employee updated successfully!');
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        handleClose();
      }, 700);
    } catch (err: any) {
      setGlobalError(err?.detail || err?.message || 'Failed to update employee. Please check inputs.');
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl h-[660px] max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header (Same format as Add Employee) */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Employee</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update employee details, job & organizational assignments, compensation, and access
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

        {/* Tab Navigation (Matching Add Employee Pill Design) */}
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
            <span>Personal</span>
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
            <span>Job & Org</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('salary')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'salary'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Salary & Bank</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Emergency & Access</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && activeTab !== 'security') {
              e.preventDefault();
              if (activeTab === 'personal') setActiveTab('job');
              else if (activeTab === 'job') setActiveTab('salary');
              else if (activeTab === 'salary') setActiveTab('security');
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

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-700 font-medium animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL INFO */}
          {activeTab === 'personal' && (
            <div className="space-y-4.5 animate-in fade-in duration-150">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="Enter full name (e.g. Rahul Sharma)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                {errors.name && <p className="text-[11px] text-red-500 font-medium">{errors.name.message}</p>}
              </div>

              {/* Login Email & Mobile Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Primary / Login Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {errors.email && <p className="text-[11px] text-red-500 font-medium">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Mobile Number</label>
                    <span className="text-[11px] text-slate-400">10 digits</span>
                  </div>
                  <CountryPhoneInput
                    value={watch('mob') || ''}
                    onChange={(val) => setValue('mob', val, { shouldValidate: true, shouldDirty: true })}
                    placeholder="9876543210"
                    error={errors.mob?.message}
                  />
                </div>
              </div>

              {/* Personal Email & Official Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Personal Email</label>
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
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Office Email</label>
                  <input
                    type="email"
                    {...register('office_email')}
                    placeholder="office@company.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Gender & Blood Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Gender</label>
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
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Blood Group</label>
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

              {/* Date of Birth & Photo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Date of Birth</label>
                    <span className="text-[11px] text-slate-400">18+ required</span>
                  </div>
                  <input
                    type="date"
                    {...register('birth_date')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  />
                  {errors.birth_date && (
                    <p className="text-[11px] text-red-500 font-medium">{errors.birth_date.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
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
                    <span className="truncate">
                      {selectedPhotoFile ? selectedPhotoFile.name : photoPreview ? 'Change photo' : 'Choose photo (JPG/PNG)'}
                    </span>
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Current Address</label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>
                <textarea
                  rows={2}
                  {...register('address')}
                  placeholder="Street, City, State, PIN code..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: JOB & ORGANIZATION */}
          {activeTab === 'job' && (
            <div className="space-y-4.5 animate-in fade-in duration-150">
              {/* Department Selection with Search Bar & Checkbox Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                  Assigned Department(s) <span className="text-red-500">*</span>
                </label>
                <DepartmentMultiSelect
                  departments={deptOptions}
                  selectedIds={watchedDepIds}
                  onChange={(ids) => {
                    setValue('department_ids', ids, { shouldValidate: true, shouldDirty: true });
                    setValue('dep_id', ids.length > 0 ? (ids[0] as any) : (1 as any), { shouldValidate: true });
                  }}
                  placeholder="Select Department(s)..."
                  error={errors.department_ids?.message}
                />
              </div>

              {/* Designation & Employment Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Designation / Role
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

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Employment Type</label>
                  <select
                    {...register('employment_type_id')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="">Select Type</option>
                    {employmentTypeLookups.map((et) => (
                      <option key={et.id} value={et.id}>
                        {et.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reporting Manager & Joining Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Reporting Manager</label>
                  <ReportingManagerSelect
                    options={managerOptions.filter((mgr) => mgr.emp_id !== employee.emp_id)}
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

              {/* Shift & Leave Policy */}
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

              {/* Probation & Notice Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Probation Period
                  </label>
                  <input
                    type="text"
                    list="edit-probation-options"
                    {...register('probation_period')}
                    placeholder="e.g. 90 Days (3 Months)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <datalist id="edit-probation-options">
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
                    list="edit-notice-options"
                    {...register('notice_period')}
                    placeholder="e.g. 30 Days"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <datalist id="edit-notice-options">
                    <option value="Immediate" />
                    <option value="15 Days" />
                    <option value="30 Days" />
                    <option value="60 Days" />
                    <option value="90 Days" />
                  </datalist>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SALARY & BANKING */}
          {activeTab === 'salary' && (
            <div className="space-y-4.5 animate-in fade-in duration-150">
              {/* Gross Salary & PF Applicable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">
                    Gross Monthly Salary (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register('salary')}
                    placeholder="e.g. 50000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">PF Scheme</label>
                  <div className="flex items-center gap-2 pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        {...register('pf_applicable')}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>PF Applicable</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* UAN & Overtime */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {watchedPfApplicable && (
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 tracking-tight">UAN Number</label>
                    <input
                      type="text"
                      {...register('uan')}
                      placeholder="12-digit UAN"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                )}

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Overtime Policy</label>
                  <div className="flex items-center gap-2 pt-1">
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
                    <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5 animate-in fade-in duration-150">
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
                            {errors.ot_rate && (
                              <p className="text-[11px] text-red-500 font-medium">{errors.ot_rate.message}</p>
                            )}
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
                            {errors.ot_multiplier && (
                              <p className="text-[11px] text-red-500 font-medium">{errors.ot_multiplier.message}</p>
                            )}
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
              </div>

              {/* Bank Details */}
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
            </div>
          )}

          {/* TAB 4: EMERGENCY & ACCESS */}
          {activeTab === 'security' && (
            <div className="space-y-4.5 animate-in fade-in duration-150">
              {/* Emergency Contact */}
              <div className="space-y-2.5">
                <h4 className="text-[13px] font-semibold text-slate-700 tracking-tight">
                  Emergency Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Contact Name</label>
                    <input
                      type="text"
                      {...register('emergency_contact_name')}
                      placeholder="Relative / Guardian"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Relationship</label>
                    <input
                      type="text"
                      {...register('emergency_contact_relation')}
                      placeholder="e.g. Father, Spouse"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-600">Emergency Phone</label>
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
              </div>


            </div>
          )}

          {/* Modal Footer (Same format as Add Employee) */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {activeTab !== 'personal' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'security') setActiveTab('salary');
                    else if (activeTab === 'salary') setActiveTab('job');
                    else if (activeTab === 'job') setActiveTab('personal');
                  }}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition cursor-pointer"
                >
                  Previous
                </button>
              )}

              {activeTab !== 'security' ? (
                <button
                  key="btn-next-step"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (activeTab === 'personal') setActiveTab('job');
                    else if (activeTab === 'job') setActiveTab('salary');
                    else if (activeTab === 'salary') setActiveTab('security');
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl transition cursor-pointer"
                >
                  Next Step
                </button>
              ) : (
                <button
                  key="btn-save-changes"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
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
