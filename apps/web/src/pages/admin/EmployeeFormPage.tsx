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
import { useLookupsQuery } from '../../hooks/use-master-data';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout } from '../../components/AdminLayout';
import { PhotoPicker } from '../../components/PhotoPicker';
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
  Building2,
  User,
  Heart,
  Briefcase,
  Search,
  Plus,
  X,
} from 'lucide-react';
import { EmployeeDocumentFormCards } from './EmployeeDocumentFormCards';

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
  personal_email: 'employee-personal-email-input',
  office_email: 'employee-office-email-input',
  mob: 'employee-mob-input',
  gender_id: 'employee-gender-select',
  emergency_contact_name: 'employee-emergency-name-input',
  emergency_contact_number: 'employee-emergency-number-input',
  emergency_contact_relation: 'employee-emergency-relation-input',
  birth_date: 'employee-birth-date-input',
  blood_group: 'employee-blood-group-select',
  address: 'employee-address-input',
  dep_id: 'employee-dep-select',
  role_id: 'employee-role-select',
  reporting_manager: 'employee-manager-select',
  employment_type_id: 'employee-employment-type-select',
  joining_date: 'employee-joining-date-input',
  salary: 'employee-salary-input',
  pf: 'employee-pf-input',
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

  // Department search for multi-select recommendation
  const [deptSearchQuery, setDeptSearchQuery] = useState('');

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

  // Master lookup queries
  const { data: genderLookups } = useLookupsQuery('gender');
  const { data: employmentTypeLookups } = useLookupsQuery('employment_type');
  const { data: bloodGroupLookups } = useLookupsQuery('blood_group');

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
    formState: { errors, isSubmitting },
  } = form;

  const watchedDepartmentIds = watch('department_ids') || [];
  const watchedPassword = watch('password');
  const watchedName = watch('name');

  // Dependent roles query across all selected departments
  const { data: roleOptions, isLoading: isRolesLoading } = useRoleOptionsQuery(
    watchedDepartmentIds.length > 0 ? watchedDepartmentIds : undefined,
  );

  // Populate data in Edit mode
  useEffect(() => {
    if (existingEmployee) {
      const assignedDepIds =
        existingEmployee.departments && existingEmployee.departments.length > 0
          ? existingEmployee.departments.map((d) => d.dep_id)
          : [existingEmployee.dep_id];

      reset({
        name: existingEmployee.name,
        email: existingEmployee.email,
        personal_email: existingEmployee.personal_email || '',
        office_email: existingEmployee.office_email || existingEmployee.email,
        mob: existingEmployee.mob || '',
        gender_id: existingEmployee.gender_id ?? ('' as any),
        emergency_contact_name: existingEmployee.emergency_contact_name || '',
        emergency_contact_number: existingEmployee.emergency_contact_number || '',
        emergency_contact_relation: existingEmployee.emergency_contact_relation || '',
        birth_date: existingEmployee.birth_date
          ? new Date(existingEmployee.birth_date).toISOString().split('T')[0]
          : '',
        blood_group: existingEmployee.blood_group || '',
        address: existingEmployee.address || '',
        dep_id: existingEmployee.dep_id,
        department_ids: assignedDepIds,
        role_id: existingEmployee.role_id,
        reporting_manager: existingEmployee.reporting_manager ?? null,
        employment_type_id: existingEmployee.employment_type_id ?? ('' as any),
        joining_date: existingEmployee.joining_date
          ? new Date(existingEmployee.joining_date).toISOString().split('T')[0]
          : todayStr,
        salary: existingEmployee.salary ? Number(existingEmployee.salary) : 0,
        pf: existingEmployee.pf ? Number(existingEmployee.pf) : 0,
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

  const toggleDepartmentSelection = (dId: number) => {
    let nextIds: number[];
    if (watchedDepartmentIds.includes(dId)) {
      nextIds = watchedDepartmentIds.filter((id) => id !== dId);
    } else {
      nextIds = [...watchedDepartmentIds, dId];
    }
    setValue('department_ids', nextIds, { shouldValidate: true, shouldDirty: true });
    // Keep dep_id populated for database backward compatibility
    setValue('dep_id', nextIds.length > 0 ? nextIds[0] : ('' as any), { shouldValidate: true });
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

  const handleCopyHandoverCredentials = () => {
    if (createdResult) {
      const text = `Vernoxy Pulse Login Credentials:\nEmail: ${createdResult.email}\nPassword: ${createdResult.password}`;
      navigator.clipboard.writeText(text);
      setCopiedHandover(true);
      setTimeout(() => setCopiedHandover(false), 2000);
    }
  };

  const handleRetryPhoto = async () => {
    if (!createdResult?.emp_id || !selectedPhotoFile) return;
    try {
      await uploadPhotoMutation.mutateAsync({
        id: createdResult.emp_id,
        file: selectedPhotoFile,
      });
      setCreatedResult((prev) => (prev ? { ...prev, photoError: false } : null));
    } catch {
      // Photo failed again
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

  const handleServerError = (err: any) => {
    const errorData = err?.response?.data || err;
    if (errorData?.errors && typeof errorData.errors === 'object') {
      let firstFieldId: string | null = null;
      for (const [field, message] of Object.entries(errorData.errors)) {
        setError(field as any, {
          type: 'server',
          message: message as string,
        });
        if (!firstFieldId && FIELD_TO_ID_MAP[field]) {
          firstFieldId = FIELD_TO_ID_MAP[field];
        }
      }
      if (firstFieldId) {
        focusFieldById(firstFieldId);
      }
      return;
    }

    if (errorData?.field && errorData?.message) {
      setError(errorData.field as any, {
        type: 'server',
        message: errorData.message,
      });
      if (FIELD_TO_ID_MAP[errorData.field]) {
        focusFieldById(FIELD_TO_ID_MAP[errorData.field]);
      }
      return;
    }

    setGlobalError(
      errorData?.detail ||
        errorData?.message ||
        'An unexpected server error occurred. Please try again.',
    );
  };

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

    const primaryDepId = Number(values.dep_id);
    const departmentIds = Array.from(
      new Set([primaryDepId, ...(values.department_ids || [])]),
    );

    if (!isEdit) {
      try {
        const createdEmp = await createMutation.mutateAsync({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          personal_email: values.personal_email?.trim() || undefined,
          office_email: values.office_email?.trim() || values.email.trim().toLowerCase(),
          mob: values.mob?.trim() || undefined,
          password: values.password!,
          dep_id: primaryDepId,
          department_ids: departmentIds,
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
        });

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
            personal_email: values.personal_email?.trim() || undefined,
            office_email: values.office_email?.trim() || undefined,
            mob: values.mob?.trim() || undefined,
            dep_id: primaryDepId,
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
            employment_type_id: values.employment_type_id ? Number(values.employment_type_id) : null,
            joining_date: values.joining_date,
            salary: Number(values.salary || 0),
            pf: Number(values.pf || 0),
            exit_date: values.exit_date || null,
            status: values.status,
          },
        });

        const targetShiftId = selectedShiftId === 'default' ? null : parseInt(selectedShiftId, 10);
        try {
          await assignShiftMutation.mutateAsync({ empId: employeeId, shiftId: targetShiftId });
        } catch {}

        navigate(`/admin/employees/${employeeId}`);
      } catch (err: any) {
        handleServerError(err);
      }
    }
  };

  const onError = (formErrors: typeof errors) => {
    const firstKey = Object.keys(formErrors)[0];
    if (firstKey && FIELD_TO_ID_MAP[firstKey]) {
      focusFieldById(FIELD_TO_ID_MAP[firstKey]);
    }
  };

  const filteredRecommendedDepts = (deptOptions || []).filter(
    (d) =>
      !watchedDepartmentIds.includes(d.dep_id) &&
      d.name.toLowerCase().includes(deptSearchQuery.toLowerCase()),
  );

  const fallbackBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  if (isEdit && isEmployeeLoading) {
    return (
      <AdminLayout>
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading employee...</p>
        </div>
      </AdminLayout>
    );
  }

  const errorKeys = Object.keys(errors);

  return (
    <AdminLayout title={isEdit ? 'Edit Employee' : 'Add Employee'} fluid>
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        {/* Page Header */}
        <div className="flex items-start gap-4">
          <button
            type="button"
            id="page-header-back-button"
            onClick={() => navigate(isEdit && employeeId ? `/admin/employees/${employeeId}` : '/admin/employees')}
            className="w-10 h-10 rounded-xl border border-slate-200/90 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
              {isEdit ? 'Edit Employee Profile' : 'Add New Employee'}
            </h1>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-1">
              <Link to="/admin/employees" className="hover:text-slate-700 transition-colors">
                Employees
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-blue-600 font-semibold">
                {isEdit ? existingEmployee?.name || 'Edit' : 'New Employee'}
              </span>
            </div>
          </div>
        </div>

        {/* Global Alert */}
        {globalError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm font-medium text-rose-800 flex items-start gap-3">
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

        {/* Self modification warning */}
        {isSelf && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Editing your own account:</span>
              Security policies prevent admins from changing their own primary department, role, or active status.
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8">
          {errorKeys.length > 0 && (
            <div className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Please fix the following validation errors:</span>
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

          <form onSubmit={handleSubmit(onSubmit, onError)} noValidate className="space-y-10">
            {/* SECTION 1: Personal Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Personal Information
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {/* PhotoPicker */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor="employee-name-input" className="block text-sm font-semibold text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="employee-name-input"
                    autoComplete="name"
                    placeholder="e.g. Rachel Green"
                    {...register('name')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                  />
                  {errors.name && <p className="text-xs text-red-600 font-medium">{errors.name.message}</p>}
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <label htmlFor="employee-gender-select" className="block text-sm font-semibold text-slate-700">
                    Gender
                  </label>
                  <div className="relative">
                    <select
                      id="employee-gender-select"
                      {...register('gender_id')}
                      className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                    >
                      <option value="">Select Gender</option>
                      {genderLookups?.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Mobile Phone */}
                <div className="space-y-1.5">
                  <label htmlFor="employee-mob-input" className="block text-sm font-semibold text-slate-700">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    id="employee-mob-input"
                    autoComplete="tel"
                    placeholder="+919876543210"
                    {...register('mob')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono"
                  />
                  {errors.mob && <p className="text-xs text-red-600 font-medium">{errors.mob.message}</p>}
                </div>

                {/* Office Email */}
                {!isEdit ? (
                  <div className="space-y-1.5">
                    <label htmlFor="employee-email-input" className="block text-sm font-semibold text-slate-700">
                      Office Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="employee-email-input"
                      autoComplete="email"
                      placeholder="rachel@vernoxy.com"
                      {...register('email')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                    />
                    {errors.email && <p className="text-xs text-red-600 font-medium">{errors.email.message}</p>}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label htmlFor="employee-office-email-input" className="block text-sm font-semibold text-slate-700">
                      Office Email
                    </label>
                    <input
                      type="email"
                      id="employee-office-email-input"
                      placeholder="rachel@vernoxy.com"
                      {...register('office_email')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                    />
                  </div>
                )}

                {/* Personal Email */}
                <div className="space-y-1.5">
                  <label htmlFor="employee-personal-email-input" className="block text-sm font-semibold text-slate-700">
                    Personal Email
                  </label>
                  <input
                    type="email"
                    id="employee-personal-email-input"
                    placeholder="rachel.personal@gmail.com"
                    {...register('personal_email')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                  />
                  {errors.personal_email && (
                    <p className="text-xs text-red-600 font-medium">{errors.personal_email.message}</p>
                  )}
                </div>

                {/* Birth Date */}
                <div className="space-y-1.5">
                  <label htmlFor="employee-birth-date-input" className="block text-sm font-semibold text-slate-700">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    id="employee-birth-date-input"
                    {...register('birth_date')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                  />
                </div>

                {/* Blood Group */}
                <div className="space-y-1.5">
                  <label htmlFor="employee-blood-group-select" className="block text-sm font-semibold text-slate-700">
                    Blood Group
                  </label>
                  <div className="relative">
                    <select
                      id="employee-blood-group-select"
                      {...register('blood_group')}
                      className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                    >
                      <option value="">Select Blood Group</option>
                      {bloodGroupLookups && bloodGroupLookups.length > 0
                        ? bloodGroupLookups.map((bg) => (
                            <option key={bg.id} value={bg.label}>
                              {bg.label}
                            </option>
                          ))
                        : fallbackBloodGroups.map((bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Residential Address */}
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="employee-address-input" className="block text-sm font-semibold text-slate-700">
                    Address
                  </label>
                  <textarea
                    id="employee-address-input"
                    rows={2}
                    placeholder="Full residential address..."
                    {...register('address')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                  />
                </div>

                {/* Emergency Contact Sub-section */}
                <div className="md:col-span-2 p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Emergency Contact Details
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Contact Name</label>
                      <input
                        type="text"
                        id="employee-emergency-name-input"
                        placeholder="e.g. Monica Geller"
                        {...register('emergency_contact_name')}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Contact Number</label>
                      <input
                        type="text"
                        id="employee-emergency-number-input"
                        placeholder="+919876543219"
                        {...register('emergency_contact_number')}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Relationship</label>
                      <input
                        type="text"
                        id="employee-emergency-relation-input"
                        placeholder="e.g. Spouse / Parent / Friend"
                        {...register('emergency_contact_relation')}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Job & Multi-Department Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  Job & Department Allocation
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {/* Multi-Department Selector with search and recommendations */}
              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200/70 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900">
                    Departments (Multi-Select) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Employee can work across multiple departments simultaneously.
                  </p>
                </div>

                {/* Selected Department Pills */}
                <div className="flex flex-wrap items-center gap-2 min-h-[36px]">
                  {watchedDepartmentIds.map((dId) => {
                    const dept = deptOptions?.find((d) => d.dep_id === dId);
                    return (
                      <span
                        key={dId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white shadow-2xs transition"
                      >
                        <Building2 className="w-3.5 h-3.5 text-white" />
                        <span>{dept?.name || `Department #${dId}`}</span>
                        <button
                          type="button"
                          onClick={() => toggleDepartmentSelection(dId)}
                          className="ml-1 hover:opacity-80 p-0.5 rounded-full"
                          title="Remove department"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {watchedDepartmentIds.length === 0 && (
                    <span className="text-xs text-amber-700 italic">
                      No departments selected yet. Select at least one department below.
                    </span>
                  )}
                </div>

                {/* Search / Recommend from existing departments table */}
                <div className="pt-2 border-t border-blue-200/50 space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search and recommend from existing departments..."
                      value={deptSearchQuery}
                      onChange={(e) => setDeptSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 max-h-32 overflow-y-auto pt-1">
                    {filteredRecommendedDepts.map((d) => (
                      <button
                        type="button"
                        key={d.dep_id}
                        onClick={() => toggleDepartmentSelection(d.dep_id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-xs font-medium text-slate-700 hover:text-blue-600 transition"
                      >
                        <Plus className="w-3 h-3 text-blue-500" />
                        {d.name}
                      </button>
                    ))}
                    {filteredRecommendedDepts.length === 0 && deptSearchQuery && (
                      <p className="text-xs text-slate-400 italic">No matching departments found.</p>
                    )}
                  </div>
                </div>

                {errors.dep_id && <p className="text-xs text-red-600 font-medium">{errors.dep_id.message}</p>}
                {errors.department_ids && (
                  <p className="text-xs text-red-600 font-medium">{errors.department_ids.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Designation / Role */}
                <div className="space-y-1.5">
                  <label htmlFor="employee-role-select" className="block text-sm font-semibold text-slate-700">
                    Designation (Role){' '}
                    {isRolesLoading && <span className="text-blue-600 font-normal text-xs">(Loading...)</span>}
                  </label>
                  <div className="relative">
                    <select
                      id="employee-role-select"
                      {...register('role_id')}
                      disabled={isSelf || watchedDepartmentIds.length === 0}
                      className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">
                        {watchedDepartmentIds.length === 0
                          ? 'Select department(s) first'
                          : isRolesLoading
                          ? 'Loading roles...'
                          : roleOptions?.length === 0
                          ? 'No roles available in selected departments'
                          : 'Select Designation'}
                      </option>
                      {roleOptions && roleOptions.length > 0 && (
                        watchedDepartmentIds.length > 1
                          ? Array.from(new Set(roleOptions.map((r) => r.dep_name || 'General'))).map((deptName) => (
                              <optgroup key={deptName} label={deptName}>
                                {roleOptions
                                  .filter((r) => (r.dep_name || 'General') === deptName)
                                  .map((r) => (
                                    <option key={r.role_id} value={r.role_id}>
                                      {r.role_name}
                                    </option>
                                  ))}
                              </optgroup>
                            ))
                          : roleOptions.map((r) => (
                              <option key={r.role_id} value={r.role_id}>
                                {r.role_name}
                              </option>
                            ))
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.role_id && <p className="text-xs text-red-600 font-medium">{errors.role_id.message}</p>}
                </div>

                {/* Reporting Manager */}
                <div className="space-y-1.5">
                  <label htmlFor="employee-manager-select" className="block text-sm font-semibold text-slate-700">
                    Reporting Manager
                  </label>
                  <div className="relative">
                    <select
                      id="employee-manager-select"
                      {...register('reporting_manager')}
                      className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                    >
                      <option value="">None (Top-level Executive)</option>
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

                {/* Employment Type */}
                <div className="space-y-1.5">
                  <label htmlFor="employee-employment-type-select" className="block text-sm font-semibold text-slate-700">
                    Employment Type
                  </label>
                  <div className="relative">
                    <select
                      id="employee-employment-type-select"
                      {...register('employment_type_id')}
                      className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                    >
                      <option value="">Select Employment Type</option>
                      {employmentTypeLookups?.map((et) => (
                        <option key={et.id} value={et.id}>
                          {et.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Joining Date */}
                <div className="space-y-1.5">
                  <label htmlFor="employee-joining-date-input" className="block text-sm font-semibold text-slate-700">
                    Joining Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="employee-joining-date-input"
                    {...register('joining_date')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                  />
                  <p className="text-2xs text-slate-400">By default today. Past and future dates acceptable.</p>
                  {errors.joining_date && (
                    <p className="text-xs text-red-600 font-medium">{errors.joining_date.message}</p>
                  )}
                </div>

                {/* Salary */}
                <div className="space-y-1.5">
                  <label htmlFor="employee-salary-input" className="block text-sm font-semibold text-slate-700">
                    Base Salary (Monthly ₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    id="employee-salary-input"
                    placeholder="0"
                    {...register('salary')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono font-medium"
                  />
                  <p className="text-2xs text-slate-400">Starts from 0, cannot be negative.</p>
                  {errors.salary && <p className="text-xs text-red-600 font-medium">{errors.salary.message}</p>}
                </div>

                {/* PF */}
                <div className="space-y-1.5">
                  <label htmlFor="employee-pf-input" className="block text-sm font-semibold text-slate-700">
                    Provident Fund (PF Deduction ₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    id="employee-pf-input"
                    placeholder="0"
                    {...register('pf')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono font-medium"
                  />
                  <p className="text-2xs text-slate-400">Starts from 0, cannot be negative.</p>
                  {errors.pf && <p className="text-xs text-red-600 font-medium">{errors.pf.message}</p>}
                </div>

                {/* Assigned Operational Shift */}
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="employee-shift-select" className="block text-sm font-semibold text-slate-700">
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
                </div>

                {/* Exit Date & Status for Edit Mode */}
                {isEdit && (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="employee-exit-date-input" className="block text-sm font-semibold text-slate-700">
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
                      <label htmlFor="employee-status-select" className="block text-sm font-semibold text-slate-700">
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

            {/* SECTION: Employee Documents & NDA (Parts 5 & 6) */}
            <EmployeeDocumentFormCards
              employeeId={employeeId}
              isEmployeeActive={existingEmployee?.status !== 'Inactive'}
            />

            {/* SECTION 3: Account Password (Create flow only) */}
            {!isEdit && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    Account Password
                  </span>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>

                <div className="space-y-5 max-w-xl">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="employee-password-input" className="block text-sm font-semibold text-slate-700">
                        Initial Account Password <span className="text-red-500">*</span>
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
                    {errors.password && <p className="text-xs text-red-600 font-medium">{errors.password.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="employee-confirm-password-input" className="block text-sm font-semibold text-slate-700">
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
                      <p className="text-xs text-red-600 font-medium">{errors.confirm_password.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="border-t border-slate-200/90 pt-6 mt-8 flex items-center justify-between gap-3 sticky bottom-0 bg-white/95 backdrop-blur-xs py-3">
              <Link
                to={isEdit && employeeId ? `/admin/employees/${employeeId}` : '/admin/employees'}
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
                {isEdit ? 'Save Changes' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Handover Dialog */}
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

              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans">Full Name</span>
                  <span className="font-semibold text-slate-900">{createdResult.name}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans">Office Email</span>
                  <span className="font-semibold text-slate-900">{createdResult.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Initial Password</span>
                  <span className="font-bold text-blue-600 select-all font-mono">
                    {createdResult.password}
                  </span>
                </div>
              </div>

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
                  id="handover-view-employees-btn"
                  onClick={() => navigate(`/admin/employees/${createdResult.emp_id}`)}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  View Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
