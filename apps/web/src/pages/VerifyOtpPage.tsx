import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { customFetch, VerifyLoginResponseDto, LoginResponseDto } from '@vernoxy-pulse/api-client';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/AuthLayout';

export const VerifyOtpPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { handleLoginSuccess } = useAuth();

  const state = (location.state as { challenge_id?: string; masked_email?: string }) || {};
  const [challengeId, setChallengeId] = useState<string>(state.challenge_id || '');
  const maskedEmail = state.masked_email || 'your email';

  const [code, setCode] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // If no challenge_id in state, redirect to login
  useEffect(() => {
    if (!challengeId) {
      navigate('/login', { replace: true });
    }
  }, [challengeId, navigate]);

  // 60-second resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await customFetch<VerifyLoginResponseDto>('/api/v1/auth/login/verify', {
        method: 'POST',
        body: JSON.stringify({
          challenge_id: challengeId,
          code,
        }),
      });

      await handleLoginSuccess(response);
      if (response.must_change_password) {
        navigate('/change-password', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setServerError(err.detail || err.message || 'Invalid or expired code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || isResending) return;
    setIsResending(true);
    setServerError(null);
    setInfoMessage(null);

    try {
      const response = await customFetch<LoginResponseDto>('/api/v1/auth/login/resend', {
        method: 'POST',
        body: JSON.stringify({ challenge_id: challengeId }),
      });

      setChallengeId(response.challenge_id);
      setResendCountdown(response.resend_available_in_seconds || 60);
      setCode('');
      setInfoMessage('A new verification code has been sent to your email.');
    } catch (err: any) {
      setServerError(err.detail || err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setCode(pasted);
  };

  return (
    <AuthLayout
      title="Two-Factor Authentication"
      subtitle={`Enter the 6-digit verification code sent to ${maskedEmail}`}
    >
      <form onSubmit={handleVerify} className="space-y-5" noValidate>
        {serverError && (
          <div
            id="verify-error-alert"
            role="alert"
            aria-live="polite"
            className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800 border border-red-200"
          >
            {serverError}
          </div>
        )}

        {infoMessage && (
          <div
            id="verify-info-alert"
            role="status"
            aria-live="polite"
            className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800 border border-emerald-200"
          >
            {infoMessage}
          </div>
        )}

        <div>
          <label htmlFor="otp-code-input" className="block text-sm font-medium text-slate-700 text-center">
            Security Code
          </label>
          <div className="mt-2 flex justify-center">
            <input
              id="otp-code-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              onPaste={handlePaste}
              autoFocus
              aria-label="6-digit verification code"
              placeholder="000000"
              className="w-48 text-center text-3xl font-mono tracking-[0.5em] font-bold rounded-lg border border-slate-300 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">
            Valid for 10 minutes &middot; Max 5 attempts
          </p>
        </div>

        <button
          type="submit"
          id="verify-submit-button"
          disabled={code.length !== 6 || isSubmitting}
          className="flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify & Sign In'
          )}
        </button>

        <div className="flex flex-col items-center gap-3 pt-2">
          {/* Resend button with countdown */}
          <button
            type="button"
            id="resend-otp-button"
            onClick={handleResend}
            disabled={resendCountdown > 0 || isResending}
            className="inline-flex items-center text-xs font-semibold text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Sending new code...
              </>
            ) : resendCountdown > 0 ? (
              `Resend code in ${resendCountdown}s`
            ) : (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Resend security code
              </>
            )}
          </button>

          <Link
            to="/login"
            id="back-to-login-link"
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
