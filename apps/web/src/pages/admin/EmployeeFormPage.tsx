import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useEmployeeDetailQuery,
  useDepartmentOptionsQuery,
  useRoleOptionsQuery,
  useEmployeeOptionsQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useUploadEmployeePhotoMutation,
  useRemoveEmployeePhotoMutation,
} from '../../hooks/use-organization';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout } from '../../components/AdminLayout';
import { PhotoPicker } from '../../components/PhotoPicker';
import { DependentSelect } from '../../components/DependentSelect';
import {
  useAttendanceSettingsQuery,
  useAssignEmployeeShiftMutation,
} from '../../features/attendance/hooks/use-attendance-settings';
import {
  ArrowLeft,
  AlertCircle,
  Copy,
  CheckCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

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

import {
  employeeCreateSchema,
  employeeEditSchema,
  type EmployeeFormValues,
} from './employee-form.schema';

export { employeeCreateSchema, employeeEditSchema, type EmployeeFormValues };

const FIELD_TO_ID_MAP: Record<string, string> = {
  name: 'employee-name-input',
  email: 'employee-email-input',
  mob: 'employee-mob-input',
  dep_id: 'employee-dep-select',
  role_id: 'employee-role-select',
  reporting_manager: 'employee-manager-select',
  joining_date: 'employee-joining-date-input',
  exit_date: 'employee-exit-date-input',
  status: 'employee-status-select',
  password: 'employee-password-input',
  confirm_password: 'employee-confirm-password-input',
};

export const EmployeeFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const employeeId = id ? parseInt(id, 10) : undefined;
  const navigate = useNavigate();
  const { user: currentUser, refreshProfile } = useAuth();
  const isSelf = currentUser?.emp_id === employeeId;

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [copiedHandover, setCopiedHandover] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Photo state
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // Global server error alert
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Handover state on successful create
  const [createdResult, setCreatedResult] = useState<{
    emp_id: number;
    name: string;
    email: string;
    password: string;
    photoError?: boolean;
  } | null>(null);

  // TanStack queries
  const { data: deptOptions } = useDepartmentOptionsQuery();
  const { data: managerOptions } = useEmployeeOptionsQuery();
  const { data: existingEmployee, isLoading: isEmployeeLoading } =
    useEmployeeDetailQuery(employeeId);

  // Mutations
  const createMutation = useCreateEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation();
  const uploadPhotoMutation = useUploadEmployeePhotoMutation();
  const removePhotoMutation = useRemoveEmployeePhotoMutation();
  const { data: attendanceSettings } = useAttendanceSettingsQuery();
  const assignShiftMutation = useAssignEmployeeShiftMutation();
  const [selectedShiftId, setSelectedShiftId] = useState<string>('default');

  const todayStr = new Date().toISOString().split('T')[0];

  const form = useForm<EmployeeFormValues>({
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    resolver: zodResolver(isEdit ? employeeEditSchema : employeeCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      mob: '',
      dep_id: '' as unknown as number,
      role_id: '' as unknown as number,
      reporting_manager: null,
      joining_date: todayStr,
      exit_date: '',
      status: 'Active',
      password: '',
      confirm_password: '',
      must_change_password: false,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const watchedDepId = watch('dep_id');
  const watchedPassword = watch('password');
  const watchedName = watch('name');

  // Dependent roles query
  const { data: roleOptions, isLoading: isRolesLoading } = useRoleOptionsQuery(
    typeof watchedDepId === 'number' && watchedDepId > 0 ? watchedDepId : undefined,
  );

  // Populate data in Edit mode
  useEffect(() => {
    if (existingEmployee) {
      reset({
        name: existingEmployee.name,
        email: existingEmployee.email,
        mob: existingEmployee.mob || '',
        dep_id: existingEmployee.dep_id,
        role_id: existingEmployee.role_id,
        reporting_manager: existingEmployee.reporting_manager ?? null,
        joining_date: existingEmployee.joining_date
          ? new Date(existingEmployee.joining_date).toISOString().split('T')[0]
          : todayStr,
        exit_date: existingEmployee.exit_date
          ? new Date(existingEmployee.exit_date).toISOString().split('T')[0]
          : '',
        status: existingEmployee.status,
      });
      if (existingEmployee.profile_picture_url) {
        setPhotoPreviewUrl(existingEmployee.profile_picture_url);
      }
      const currentShift = attendanceSettings?.employee_shifts?.[String(employeeId)];
      if (currentShift) {
        setSelectedShiftId(String(currentShift));
      } else {
        setSelectedShiftId('default');
      }
    }
  }, [existingEmployee, reset, todayStr, employeeId, attendanceSettings]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !createdResult) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, createdResult]);

  // Handle department change: clear role and reload
  const handleDepartmentChange = (newDepId: number | '') => {
    setValue('dep_id', newDepId as number, { shouldValidate: true, shouldDirty: true });
    setValue('role_id', '' as unknown as number, { shouldValidate: true, shouldDirty: true });
  };

  const handleGeneratePassword = () => {
    const pwd = generateSecurePassword(16);
    setValue('password', pwd, { shouldValidate: true, shouldDirty: true });
    setValue('confirm_password', pwd, { shouldValidate: true, shouldDirty: true });
  };

  const handleCopyPassword = () => {
    if (watchedPassword) {
      navigator.clipboard.writeText(watchedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  // Immediate upload for Edit mode
  const handleEditPhotoUpload = async (file: File) => {
    if (!employeeId) return;
    const updated = await uploadPhotoMutation.mutateAsync({ id: employeeId, file });
    if (updated.profile_picture_url) {
      setPhotoPreviewUrl(updated.profile_picture_url);
    }
    if (isSelf) {
      await refreshProfile();
    }
  };

  // Immediate remove for Edit mode
  const handleEditPhotoRemove = async () => {
    if (!employeeId) return;
    await removePhotoMutation.mutateAsync(employeeId);
    setPhotoPreviewUrl(null);
    if (isSelf) {
      await refreshProfile();
    }
  };

  // Focus and scroll to element by ID
  const focusFieldById = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  };

  // Form Submission
  const onSubmit = async (values: EmployeeFormValues) => {
    setGlobalError(null);

    if (!isEdit) {
      try {
        const createdEmp = await createMutation.mutateAsync({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          mob: values.mob?.trim() || undefined,
          password: values.password!,
          dep_id: Number(values.dep_id),
          role_id: values.role_id ? Number(values.role_id) : undefined,
          reporting_manager: values.reporting_manager ? Number(values.reporting_manager) : null,
          joining_date: values.joining_date,
        });

        // After successful employee creation, attempt photo upload if chosen
        let photoFailed = false;
        if (selectedPhotoFile && createdEmp.emp_id) {
          try {
            await uploadPhotoMutation.mutateAsync({
              id: createdEmp.emp_id,
              file: selectedPhotoFile,
            });
          } catch {
            photoFailed = true;
          }
        }

        // Assign shift if chosen
        const targetShiftId = selectedShiftId === 'default' ? null : parseInt(selectedShiftId, 10);
        if (createdEmp?.emp_id) {
          try {
            await assignShiftMutation.mutateAsync({ empId: createdEmp.emp_id, shiftId: targetShiftId });
          } catch {}
        }

        // Show handover panel
        setCreatedResult({
          emp_id: createdEmp.emp_id,
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password!,
          photoError: photoFailed,
        });
      } catch (err: any) {
        handleServerError(err);
      }
    } else {
      if (!employeeId) return;
      try {
        await updateMutation.mutateAsync({
          id: employeeId,
          data: {
            name: values.name.trim(),
            mob: values.mob?.trim() || undefined,
            dep_id: Number(values.dep_id),
            role_id: values.role_id ? Number(values.role_id) : null,
            reporting_manager: values.reporting_manager ? Number(values.reporting_manager) : null,
            joining_date: values.joining_date,
            exit_date: values.exit_date || null,
            status: values.status,
          },
        });

        // Assign shift if changed
        const targetShiftId = selectedShiftId === 'default' ? null : parseInt(selectedShiftId, 10);
        try {
          await assignShiftMutation.mutateAsync({ empId: employeeId, shiftId: targetShiftId });
        } catch {}

        navigate('/admin/employees');
      } catch (err: any) {
        handleServerError(err);
      }
    }
  };

  // On client validation error: scroll to & focus first invalid field
  const onError = (formErrors: typeof errors) => {
    const firstKey = Object.keys(formErrors)[0];
    if (firstKey && FIELD_TO_ID_MAP[firstKey]) {
      focusFieldById(FIELD_TO_ID_MAP[firstKey]);
    }
  };

  const handleServerError = (err: any) => {
    const code = err?.code || err?.error_code || '';
    const detail = err?.detail || err?.message || 'An error occurred while saving employee.';
    const field = err?.field || '';

    if (
      code === 'EMAIL_TAKEN' ||
      code === 'EMAIL_EXISTS' ||
      field === 'email' ||
      detail.toLowerCase().includes('email')
    ) {
      setError('email', { message: 'This email is already registered' });
      focusFieldById('employee-email-input');
    } else if (
      code === 'MOBILE_TAKEN' ||
      code === 'MOB_EXISTS' ||
      field === 'mob' ||
      detail.toLowerCase().includes('mobile')
    ) {
      setError('mob', { message: 'This mobile number is already in use' });
      focusFieldById('employee-mob-input');
    } else if (
      code === 'ROLE_NOT_IN_DEPARTMENT' ||
      field === 'role_id' ||
      detail.toLowerCase().includes('role')
    ) {
      setError('role_id', { message: 'Selected role does not belong to the chosen department' });
      focusFieldById('employee-role-select');
    } else if (
      code === 'WEAK_PASSWORD' ||
      field === 'password' ||
      detail.toLowerCase().includes('password')
    ) {
      setError('password', { message: 'Password does not meet organizational security policy' });
      focusFieldById('employee-password-input');
    } else {
      setGlobalError(detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRetryPhoto = async () => {
    if (!createdResult?.emp_id || !selectedPhotoFile) return;
    try {
      await uploadPhotoMutation.mutateAsync({
        id: createdResult.emp_id,
        file: selectedPhotoFile,
      });
      setCreatedResult({ ...createdResult, photoError: false });
    } catch (err: any) {
      alert('Retry failed: ' + (err.detail || err.message || 'Photo upload error'));
    }
  };

  const handleCopyHandoverCredentials = () => {
    if (!createdResult) return;
    const text = `Vernoxy Pulse Account Credentials\nName: ${createdResult.name}\nEmail: ${createdResult.email}\nInitial Password: ${createdResult.password}\nLogin: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedHandover(true);
    setTimeout(() => setCopiedHandover(false), 3000);
  };

  if (isEdit && isEmployeeLoading) {
    return (
      <AdminLayout>
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading employee details...</p>
        </div>
      </AdminLayout>
    );
  }

  const errorKeys = Object.keys(errors);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start gap-4">
          <button
            type="button"
            id="page-header-back-button"
            onClick={() => navigate('/admin/employees')}
            className="w-11 h-11 rounded-xl border border-slate-200/90 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-700 shadow-xs transition-colors shrink-0"
            aria-label="Back to employees"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
              {isEdit ? 'Edit Employee' : 'Add Employee'}
            </h1>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-1">
              <Link to="/admin/employees" className="hover:text-slate-700 transition-colors">
                Employees
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-blue-600 font-semibold">
                {isEdit ? 'Edit Employee' : 'Add Employee'}
              </span>
            </div>
          </div>
        </div>

        {/* Global Aria-Live Error Alert */}
        <div aria-live="polite">
          {globalError && (
            <div
              id="form-global-error-alert"
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm font-medium text-rose-800 flex items-start gap-3 animate-in fade-in"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{globalError}</div>
              <button
                type="button"
                onClick={() => setGlobalError(null)}
                className="text-rose-500 hover:text-rose-700 font-bold"
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {/* Self modification banner */}
        {isSelf && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Editing your own account:</span>
              Organization security policy prevents administrators from changing their own role, department, or active status.
            </div>
          </div>
        )}

        {/* ONE Single-Page Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8">
          {/* One-line description */}
          <div className="mb-6">
            <p className="text-xs text-slate-500">
              {isEdit
                ? 'Update employee profile and assigned employment details.'
                : 'Create a new employee profile and assign employment details.'}
            </p>
          </div>

          {/* Validation Error Summary at top (aria-live) */}
          {errorKeys.length > 0 && (
            <div
              id="form-error-summary"
              role="alert"
              aria-live="polite"
              className="mb-8 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5 animate-in fade-in"
            >
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Please fix the following errors before submitting:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 pt-1 text-rose-700">
                {errorKeys.map((key) => {
                  const errorMsg = (errors as any)[key]?.message;
                  const inputId = FIELD_TO_ID_MAP[key];
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => inputId && focusFieldById(inputId)}
                        className="underline hover:text-rose-950 font-medium text-left"
                      >
                        {errorMsg}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit, onError)} noValidate className="space-y-8">
            {/* SECTION 1: Personal Information */}
            <div className="space-y-6">
              {/* Heading with horizontal divider */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  About Employee
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {/* PhotoPicker component */}
              <div className="pt-1 pb-1">
                <PhotoPicker
                  employeeName={watchedName || (isEdit ? existingEmployee?.name : 'Employee')}
                  currentPhotoUrl={photoPreviewUrl}
                  selectedFile={selectedPhotoFile}
                  onFileSelect={(file, preview) => {
                    setSelectedPhotoFile(file);
                    setPhotoPreviewUrl(preview);
                  }}
                  onUploadImmediate={isEdit ? handleEditPhotoUpload : undefined}
                  onRemoveImmediate={isEdit ? handleEditPhotoRemove : undefined}
                />
              </div>

              {/* 2-column grid on desktop, 1-column below 768px */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="employee-name-input"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="employee-name-input"
                    autoComplete="name"
                    placeholder="Enter full name"
                    {...register('name')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600 font-medium">{errors.name.message}</p>
                  )}
                </div>

                {/* Work Email (Omitted on edit) */}
                {!isEdit && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="employee-email-input"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="employee-email-input"
                      autoComplete="email"
                      placeholder="Enter work email address"
                      {...register('email')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-slate-500">
                      Used to log in and receive verification codes
                    </p>
                    {errors.email && (
                      <p className="text-xs text-red-600 font-medium">{errors.email.message}</p>
                    )}
                  </div>
                )}

                {/* Mobile Phone (Optional) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="employee-mob-input"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Mobile
                  </label>
                  <input
                    type="text"
                    id="employee-mob-input"
                    autoComplete="tel"
                    placeholder="+919876543210"
                    {...register('mob')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
                  />
                  <p className="text-xs text-slate-500">
                    Digits with optional +, country code first
                  </p>
                  {errors.mob && (
                    <p className="text-xs text-red-600 font-medium">{errors.mob.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: Job Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  Job Details
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Department Select */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="employee-dep-select"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Department <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="employee-dep-select"
                      value={watchedDepId}
                      disabled={isSelf}
                      onChange={(e) =>
                        handleDepartmentChange(e.target.value ? Number(e.target.value) : '')
                      }
                      className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium disabled:opacity-50"
                    >
                      <option value="">Select Department</option>
                      {deptOptions?.map((d) => (
                        <option key={d.dep_id} value={d.dep_id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.dep_id && (
                    <p className="text-xs text-red-600 font-medium">{errors.dep_id.message}</p>
                  )}
                </div>

                {/* Dependent Role Select */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="employee-role-select"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Role{' '}
                    {isRolesLoading && (
                      <span className="text-blue-600 font-normal">(Loading roles...)</span>
                    )}
                  </label>
                  <DependentSelect
                    id="employee-role-select"
                    parentId={watchedDepId ? Number(watchedDepId) : undefined}
                    value={watch('role_id') || undefined}
                    onChange={(val) =>
                      setValue('role_id', val ? Number(val) : ('' as any), {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    options={roleOptions?.map((r) => ({ value: r.role_id, label: r.role_name }))}
                    isLoading={isRolesLoading}
                    placeholder="Select Role"
                    noParentMessage="Select a department first"
                    emptyParentMessage="No roles in this department."
                    disabled={isSelf}
                  />

                  {/* Empty state when department has 0 roles */}
                  {watchedDepId && !isRolesLoading && roleOptions && roleOptions.length === 0 && (
                    <p className="text-xs text-amber-700">
                      No roles in this department.{' '}
                      <Link
                        to={`/admin/settings/roles?dep_id=${watchedDepId}&new=1`}
                        className="text-blue-600 underline font-semibold"
                      >
                        Create one here
                      </Link>
                    </p>
                  )}

                  {errors.role_id && (
                    <p className="text-xs text-red-600 font-medium">{errors.role_id.message}</p>
                  )}
                </div>

                {/* Reporting Manager */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="employee-manager-select"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Reporting Manager
                  </label>
                  <div className="relative">
                    <select
                      id="employee-manager-select"
                      {...register('reporting_manager')}
                      className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                    >
                      <option value="">None (Top-level)</option>
                      {managerOptions
                        ?.filter((m) => !isEdit || m.emp_id !== employeeId)
                        ?.map((m) => (
                          <option key={m.emp_id} value={m.emp_id}>
                            {m.name} ({m.email})
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Joining Date */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="employee-joining-date-input"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Joining Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="employee-joining-date-input"
                    {...register('joining_date')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                  />
                  {errors.joining_date && (
                    <p className="text-xs text-red-600 font-medium">
                      {errors.joining_date.message}
                    </p>
                  )}
                </div>

                {/* Assigned Operational Shift */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="employee-shift-select"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Assigned Shift
                  </label>
                  <div className="relative">
                    <select
                      id="employee-shift-select"
                      value={selectedShiftId}
                      onChange={(e) => setSelectedShiftId(e.target.value)}
                      className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                    >
                      <option value="default">
                        General Shift (Company Default · {attendanceSettings?.default_shift?.start_time?.slice(0, 5) || '09:30'} - {attendanceSettings?.default_shift?.end_time?.slice(0, 5) || '18:30'}, {attendanceSettings?.default_shift?.full_day_hours || 8}h)
                      </option>
                      {attendanceSettings?.shifts
                        ?.filter((s) => !s.is_default)
                        ?.map((s) => (
                          <option key={s.shift_id} value={String(s.shift_id)}>
                            {s.shift_name} ({s.shift_code} · {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}, {s.full_day_hours}h)
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Employees inherit General Shift by default unless customized with a dedicated shift.
                  </p>
                </div>

                {/* Exit Date & Status for Edit Mode */}
                {isEdit && (
                  <>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="employee-exit-date-input"
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Exit Date
                      </label>
                      <input
                        type="date"
                        id="employee-exit-date-input"
                        {...register('exit_date')}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="employee-status-select"
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Status
                      </label>
                      <div className="relative">
                        <select
                          id="employee-status-select"
                          disabled={isSelf}
                          {...register('status')}
                          className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium disabled:opacity-50"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* SECTION 3: Account Password (Create flow only, completely omitted on edit) */}
            {!isEdit && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    Account Password
                  </span>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>

                <div className="space-y-5 max-w-xl">
                  {/* Password row with Generate & Copy */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="employee-password-input"
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Password <span className="text-red-500">*</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          id="employee-generate-password-btn"
                          onClick={handleGeneratePassword}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Generate 16-char
                        </button>

                        {watchedPassword && (
                          <button
                            type="button"
                            id="employee-copy-password-btn"
                            onClick={handleCopyPassword}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedPassword ? 'Copied' : 'Copy'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="employee-password-input"
                        autoComplete="new-password"
                        placeholder="Enter password (min 6 characters)"
                        {...register('password')}
                        className="w-full px-3.5 py-2.5 pr-12 rounded-xl border border-slate-200 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-600 font-medium">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="employee-confirm-password-input"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="employee-confirm-password-input"
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      {...register('confirm_password')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                    />
                    {errors.confirm_password && (
                      <p className="text-xs text-red-600 font-medium">
                        {errors.confirm_password.message}
                      </p>
                    )}
                  </div>

                  {/* Switch: Require password change at first login */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">
                        Require password change at first login
                      </span>
                      <span className="text-xs text-slate-500">
                        Employee will be prompted to choose a new password upon first session.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="employee-must-change-password-toggle"
                        aria-label="Require password change at first login"
                        {...register('must_change_password')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <p className="text-xs text-slate-500 italic">
                    The password is shown once after saving.
                  </p>
                </div>
              </div>
            )}

            {/* Sticky footer bar inside the card with Cancel & Submit button */}
            <div className="border-t border-slate-200/90 pt-6 mt-8 flex items-center justify-between gap-3 sticky bottom-0 bg-white/95 backdrop-blur-xs py-3">
              <Link
                to="/admin/employees"
                id="employee-form-cancel-button"
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-center"
              >
                Cancel
              </Link>

              <button
                type="submit"
                id="employee-form-submit-btn"
                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {(isSubmitting || createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                {isEdit ? 'Save Changes' : 'Create employee'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* One-time Handover Panel on Create Success */}
      {createdResult && (
        <div
          id="handover-credentials-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in"
        >
          <div
            id="handover-credentials-panel"
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="p-8 text-center bg-gradient-to-b from-blue-50/60 to-white border-b border-slate-100">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-4 shadow-xs">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Employee Created Successfully!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Please securely share these initial credentials with the employee.
              </p>
            </div>

            <div className="p-8 space-y-4">
              {/* Photo upload failure warning if photo failed */}
              {createdResult.photoError && (
                <div
                  id="photo-upload-warning"
                  className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Photo upload failed</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Employee created, but the photo could not be uploaded. You can add it from the edit page.
                    </p>
                    <button
                      type="button"
                      id="retry-photo-upload-btn"
                      onClick={handleRetryPhoto}
                      className="mt-2 text-xs font-semibold text-blue-600 underline hover:text-blue-800"
                    >
                      Retry Photo Upload
                    </button>
                  </div>
                </div>
              )}

              {/* Handover Details */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans">Full Name</span>
                  <span className="font-semibold text-slate-900">{createdResult.name}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans">Work Email</span>
                  <span className="font-semibold text-slate-900">{createdResult.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Initial Password</span>
                  <span className="font-bold text-blue-600 select-all font-mono">
                    {createdResult.password}
                  </span>
                </div>
              </div>

              <p className="text-xs text-center text-slate-500 italic">
                This password will not be shown again.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  id="handover-copy-btn"
                  onClick={handleCopyHandoverCredentials}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copiedHandover ? 'Copied to Clipboard!' : 'Copy Credentials'}
                </button>
                <button
                  type="button"
                  id="handover-add-another-btn"
                  onClick={() => {
                    setCreatedResult(null);
                    reset();
                    setSelectedPhotoFile(null);
                    setPhotoPreviewUrl(null);
                  }}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Add another
                </button>
                <button
                  type="button"
                  id="handover-view-employees-btn"
                  onClick={() => navigate('/admin/employees')}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  View employees
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
