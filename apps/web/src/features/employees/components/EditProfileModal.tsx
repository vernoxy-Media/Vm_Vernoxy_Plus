import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  User,
  Shield,
  AlertCircle,
  Loader2,
  CheckCircle,
  Upload,
  Lock,
  Building2,
  Briefcase,
  Calendar,
} from 'lucide-react';
import {
  useUpdateEmployeeMutation,
  useUploadEmployeePhotoMutation,
} from '@/features/organization/hooks/use-organization';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { CountryPhoneInput } from '@/shared/ui';
import { useAuth } from '@/features/auth/context/AuthContext';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    emp_id: number;
    name: string;
    email: string;
    personal_email?: string | null;
    mob?: string | null;
    gender_id?: number | null;
    blood_group?: string | null;
    birth_date?: string | null;
    address?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_relation?: string | null;
    emergency_contact_number?: string | null;
    profile_picture_url?: string | null;
    role_name?: string | null;
    department_name?: string | null;
    departments?: Array<{ dep_id: number; name: string }>;
    joining_date?: string | null;
    employee_code?: string | null;
  } | null;
  onSuccess?: () => void;
}

interface ProfileFormValues {
  name: string;
  personal_email: string;
  mob: string;
  gender_id: number | '';
  blood_group: string;
  birth_date: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_number: string;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSuccess,
}) => {
  const { refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'emergency' | 'org_info'>('personal');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: genderLookups = [] } = useLookupsQuery('gender');
  const { data: bloodGroupLookups = [] } = useLookupsQuery('blood_group');

  const updateMutation = useUpdateEmployeeMutation();
  const uploadPhotoMutation = useUploadEmployeePhotoMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      name: '',
      personal_email: '',
      mob: '',
      gender_id: '',
      blood_group: '',
      birth_date: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_relation: '',
      emergency_contact_number: '',
    },
  });

  useEffect(() => {
    if (employee && isOpen) {
      reset({
        name: employee.name || '',
        personal_email: employee.personal_email || '',
        mob: employee.mob || '',
        gender_id: employee.gender_id ?? '',
        blood_group: employee.blood_group || '',
        birth_date: employee.birth_date ? employee.birth_date.slice(0, 10) : '',
        address: employee.address || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_relation: employee.emergency_contact_relation || '',
        emergency_contact_number: employee.emergency_contact_number || '',
      });
      setPhotoPreview(employee.profile_picture_url || null);
      setSelectedPhotoFile(null);
      setGlobalError(null);
      setSuccessMessage(null);
      setActiveTab('personal');
    }
  }, [employee, isOpen, reset]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setGlobalError('Photo must be less than 5 MB.');
        return;
      }
      setSelectedPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setGlobalError(null);
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    if (!employee) return;
    setGlobalError(null);
    setSuccessMessage(null);

    try {
      // 1. Update personal information only
      await updateMutation.mutateAsync({
        id: employee.emp_id,
        data: {
          name: values.name.trim(),
          mob: values.mob.trim() || undefined,
          personal_email: values.personal_email.trim() || undefined,
          gender_id: values.gender_id ? Number(values.gender_id) : undefined,
          blood_group: values.blood_group || undefined,
          birth_date: values.birth_date || undefined,
          address: values.address.trim() || undefined,
          emergency_contact_name: values.emergency_contact_name.trim() || undefined,
          emergency_contact_relation: values.emergency_contact_relation.trim() || undefined,
          emergency_contact_number: values.emergency_contact_number.trim() || undefined,
        },
      });

      // 2. Upload photo if changed
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

      await refreshProfile();
      setSuccessMessage('Profile updated successfully!');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setGlobalError(err?.detail || err?.message || 'Failed to update profile. Please try again.');
    }
  };

  if (!isOpen || !employee) return null;

  const departmentDisplay =
    employee.departments && employee.departments.length > 0
      ? employee.departments.map((d) => d.name).join(', ')
      : employee.department_name || 'General';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl h-[640px] max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your personal details, contact preferences, and emergency information
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
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
            onClick={() => setActiveTab('emergency')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'emergency'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Emergency Contacts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('org_info')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'org_info'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Organizational Info (Read-only)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-7 space-y-5 custom-scrollbar">
          {globalError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-600 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-700 font-medium animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL DETAILS */}
          {activeTab === 'personal' && (
            <div className="space-y-4.5 animate-in fade-in duration-150">
              {/* Profile Photo Uploader */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 border-2 border-white shadow-xs shrink-0 flex items-center justify-center">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">Profile Picture</h4>
                  <p className="text-[11px] text-slate-500">Supports JPG, PNG up to 5MB.</p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition shadow-2xs mt-1">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Change Photo</span>
                    <input type="file" accept="image/jpeg,image/png" onChange={handlePhotoSelect} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  {...register('name', { required: 'Name is required' })}
                  placeholder="Enter full name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                {errors.name && <p className="text-[11px] text-red-500 font-medium">{errors.name.message}</p>}
              </div>

              {/* Personal Email & Mobile Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Personal Email</label>
                  <input
                    type="email"
                    {...register('personal_email')}
                    placeholder="personal@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Mobile Number</label>
                  <CountryPhoneInput
                    value={watch('mob') || ''}
                    onChange={(val) => setValue('mob', val, { shouldValidate: true, shouldDirty: true })}
                    placeholder="9876543210"
                  />
                </div>
              </div>

              {/* Gender & Blood Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Gender</label>
                  <select
                    {...register('gender_id')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
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
                  <label className="text-[13px] font-semibold text-slate-700">Blood Group</label>
                  <select
                    {...register('blood_group')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
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

              {/* Date of Birth & Address */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  {...register('birth_date')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Current Residential Address</label>
                <textarea
                  rows={2}
                  {...register('address')}
                  placeholder="Street, City, State, PIN..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: EMERGENCY CONTACTS */}
          {activeTab === 'emergency' && (
            <div className="space-y-4.5 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-xs text-blue-800">
                <span className="font-bold">Emergency Point of Contact:</span> Please provide a primary family member or guardian details for urgent workplace notifications.
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Contact Person Name</label>
                <input
                  type="text"
                  {...register('emergency_contact_name')}
                  placeholder="e.g. Suman Sharma"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Relationship</label>
                  <input
                    type="text"
                    {...register('emergency_contact_relation')}
                    placeholder="e.g. Father, Spouse, Mother"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Emergency Phone Number</label>
                  <CountryPhoneInput
                    value={watch('emergency_contact_number') || ''}
                    onChange={(val) =>
                      setValue('emergency_contact_number', val, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    placeholder="9876543210"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ORGANIZATIONAL INFO (LOCKED) */}
          {activeTab === 'org_info' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-1">
                  <span className="font-bold">Organization & Compensation Information is Locked:</span>
                  <p>
                    Department assignments, Designation, Salary, Statutory PF, and Joining dates are managed directly by HR and Organization Administrators. To request updates to these fields, please contact your HR department.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    Department
                  </span>
                  <p className="text-sm font-bold text-slate-800">{departmentDisplay}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                    Designation / Role
                  </span>
                  <p className="text-sm font-bold text-slate-800">{employee.role_name || 'Staff'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    Employee ID
                  </span>
                  <p className="text-sm font-mono font-bold text-slate-800">
                    {employee.employee_code || `EMP-${employee.emp_id}`}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Official Login Email
                  </span>
                  <p className="text-sm font-bold text-slate-800 truncate">{employee.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
