import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react';
import { customFetch, ForgotPasswordResponseDto } from '@vernoxy-pulse/api-client';
import { AuthLayout } from '@/shared/layouts/AuthLayout';

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (values: ForgotFormValues) => {
    let receivedOtp: string | undefined;
    try {
      const res = await customFetch<ForgotPasswordResponseDto>('/api/v1/auth/password/forgot', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      receivedOtp = res?.otp_code;
    } catch {
      // Intentionally ignore failure to preserve generic response
    } finally {
      setSubmittedEmail(values.email);
      setDevOtp(receivedOtp || null);
      setIsSuccess(true);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle="If an account exists with that email, we have sent instructions to reset your password."
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-800">
            <MailCheck className="h-6 w-6" />
          </div>
          <p className="text-sm text-slate-600">
            Check your spam folder if you do not receive the email within a couple of minutes.
          </p>
          {devOtp && (
            <div className="w-full rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-center">
              <span className="text-xs font-semibold text-blue-900 block mb-1">Your Reset Code (OTP):</span>
              <span className="font-mono text-xl font-bold tracking-widest text-blue-950 bg-white px-3 py-1 rounded border border-blue-200 select-all">
                {devOtp}
              </span>
            </div>
          )}
          <div className="w-full pt-2 space-y-2">
            <button
              type="button"
              id="proceed-to-reset-button"
              onClick={() => navigate('/reset-password', { state: { email: submittedEmail, otp_code: devOtp } })}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              Enter Reset Code
            </button>
            <Link
              to="/login"
              className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800 pt-2"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back to login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your verified work email address and we'll send you a password reset code"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'forgot-email-error' : undefined}
              className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                errors.email ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder="user@vernoxy.com"
            />
          </div>
          {errors.email && (
            <p id="forgot-email-error" className="mt-1 text-xs text-red-600" aria-live="polite">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            id="forgot-submit-button"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending code...
              </>
            ) : (
              'Send Reset Code'
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
