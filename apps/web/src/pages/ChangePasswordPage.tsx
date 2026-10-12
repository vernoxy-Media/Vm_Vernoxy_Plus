import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { customFetch } from '@vernoxy-pulse/api-client';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/AuthLayout';

const changeSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(10, 'New password must be at least 10 characters long'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type ChangeFormValues = z.infer<typeof changeSchema>;

export const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangeFormValues>({
    resolver: zodResolver(changeSchema),
  });

  const onSubmit = async (values: ChangeFormValues) => {
    setServerError(null);
    try {
      await customFetch<void>('/api/v1/auth/password/change', {
        method: 'POST',
        body: JSON.stringify({
          current_password: values.current_password,
          new_password: values.new_password,
        }),
      });

      await refreshProfile();
      navigate('/', { replace: true });
    } catch (err: any) {
      setServerError(err.detail || err.message || 'Failed to change password. Please check your current password.');
    }
  };

  return (
    <AuthLayout
      title={user?.must_change_password ? 'Password Update Required' : 'Change Password'}
      subtitle={
        user?.must_change_password
          ? 'Your administrator requires you to choose a new password before accessing the system.'
          : 'Update your account credentials to keep your account secure.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {user?.must_change_password && (
          <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              For security reasons, access to other sections is locked until you update your password.
            </span>
          </div>
        )}

        {serverError && (
          <div
            id="change-error-alert"
            role="alert"
            aria-live="polite"
            className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800 border border-red-200"
          >
            {serverError}
          </div>
        )}

        {/* Current Password */}
        <div>
          <label htmlFor="current-password" className="block text-sm font-medium text-slate-700">
            Current password
          </label>
          <div className="relative mt-1">
            <input
              id="current-password"
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('current_password')}
              aria-invalid={Boolean(errors.current_password)}
              aria-describedby={errors.current_password ? 'current-password-error' : undefined}
              className={`block w-full rounded-lg border px-3 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                errors.current_password ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            <button
              type="button"
              id="toggle-current-password-visibility"
              onClick={() => setShowCurrent((prev) => !prev)}
              aria-label={showCurrent ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.current_password && (
            <p id="current-password-error" className="mt-1 text-xs text-red-600" aria-live="polite">
              {errors.current_password.message}
            </p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="change-new-password" className="block text-sm font-medium text-slate-700">
            New password (minimum 10 characters)
          </label>
          <div className="relative mt-1">
            <input
              id="change-new-password"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('new_password')}
              aria-invalid={Boolean(errors.new_password)}
              aria-describedby={errors.new_password ? 'change-new-password-error' : undefined}
              className={`block w-full rounded-lg border px-3 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                errors.new_password ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            <button
              type="button"
              id="toggle-change-new-password-visibility"
              onClick={() => setShowNew((prev) => !prev)}
              aria-label={showNew ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.new_password && (
            <p id="change-new-password-error" className="mt-1 text-xs text-red-600" aria-live="polite">
              {errors.new_password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="change-confirm-password" className="block text-sm font-medium text-slate-700">
            Confirm new password
          </label>
          <div className="mt-1">
            <input
              id="change-confirm-password"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('confirm_password')}
              aria-invalid={Boolean(errors.confirm_password)}
              aria-describedby={errors.confirm_password ? 'change-confirm-password-error' : undefined}
              className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                errors.confirm_password ? 'border-red-500' : 'border-slate-300'
              }`}
            />
          </div>
          {errors.confirm_password && (
            <p id="change-confirm-password-error" className="mt-1 text-xs text-red-600" aria-live="polite">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            id="change-password-submit-button"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};
