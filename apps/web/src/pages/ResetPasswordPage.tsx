import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { customFetch } from '@vernoxy-pulse/api-client';
import { AuthLayout } from '../components/AuthLayout';

const resetSchema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    code: z.string().length(6, 'Reset code must be exactly 6 digits'),
    new_password: z.string().min(10, 'Password must be at least 10 characters long'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as { email?: string; otp_code?: string }) || {};
  const prefilledEmail = state.email || '';
  const prefilledOtp = state.otp_code || '';

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: prefilledEmail,
      code: prefilledOtp,
      new_password: '',
      confirm_password: '',
    },
  });

  const onSubmit = async (values: ResetFormValues) => {
    setServerError(null);
    try {
      await customFetch<void>('/api/v1/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify({
          email: values.email,
          code: values.code,
          new_password: values.new_password,
        }),
      });

      setIsSuccess(true);
    } catch (err: any) {
      setServerError(err.detail || err.message || 'Invalid email or reset code. Please try again.');
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="Your password has been reset successfully. All active sessions have been revoked."
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-sm text-slate-600">
            You can now sign in with your new password.
          </p>
          <div className="w-full pt-2">
            <button
              type="button"
              id="back-to-login-after-reset-button"
              onClick={() => navigate('/login')}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              Sign In Now
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Enter the 6-digit code from your email and choose a strong new password"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div
            id="reset-error-alert"
            role="alert"
            aria-live="polite"
            className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800 border border-red-200"
          >
            {serverError}
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'reset-email-error' : undefined}
              className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                errors.email ? 'border-red-500' : 'border-slate-300'
              }`}
            />
          </div>
          {errors.email && (
            <p id="reset-email-error" className="mt-1 text-xs text-red-600" aria-live="polite">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* 6-Digit Code */}
        <div>
          <label htmlFor="reset-code" className="block text-sm font-medium text-slate-700">
            6-digit security code
          </label>
          <div className="mt-1">
            <input
              id="reset-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              {...register('code')}
              placeholder="123456"
              aria-invalid={Boolean(errors.code)}
              aria-describedby={errors.code ? 'reset-code-error' : undefined}
              className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 font-mono tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                errors.code ? 'border-red-500' : 'border-slate-300'
              }`}
            />
          </div>
          {errors.code && (
            <p id="reset-code-error" className="mt-1 text-xs text-red-600" aria-live="polite">
              {errors.code.message}
            </p>
          )}
          {prefilledOtp && (
            <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
              <span>Security Code (OTP): <strong className="font-mono text-sm tracking-widest">{prefilledOtp}</strong></span>
              <button
                type="button"
                onClick={() => setValue('code', prefilledOtp)}
                className="font-medium text-blue-700 hover:text-blue-900 underline"
              >
                Auto-fill
              </button>
            </div>
          )}
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
            New password (minimum 10 characters)
          </label>
          <div className="relative mt-1">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('new_password')}
              aria-invalid={Boolean(errors.new_password)}
              aria-describedby={errors.new_password ? 'new-password-error' : undefined}
              className={`block w-full rounded-lg border px-3 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                errors.new_password ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            <button
              type="button"
              id="toggle-new-password-visibility"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.new_password && (
            <p id="new-password-error" className="mt-1 text-xs text-red-600" aria-live="polite">
              {errors.new_password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
            Confirm new password
          </label>
          <div className="mt-1">
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('confirm_password')}
              aria-invalid={Boolean(errors.confirm_password)}
              aria-describedby={errors.confirm_password ? 'confirm-password-error' : undefined}
              className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                errors.confirm_password ? 'border-red-500' : 'border-slate-300'
              }`}
            />
          </div>
          {errors.confirm_password && (
            <p id="confirm-password-error" className="mt-1 text-xs text-red-600" aria-live="polite">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            id="reset-submit-button"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </div>

        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
