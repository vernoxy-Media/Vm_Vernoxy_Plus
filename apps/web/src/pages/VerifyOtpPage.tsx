import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, RefreshCw, KeyRound, Copy, Check } from 'lucide-react';
import { customFetch, VerifyLoginResponseDto, LoginResponseDto } from '@vernoxy-pulse/api-client';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/AuthLayout';

export const VerifyOtpPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { handleLoginSuccess } = useAuth();

  const state = (location.state as { challenge_id?: string; masked_email?: string; email?: string; otp_code?: string }) || {};
  const [challengeId, setChallengeId] = useState<string>(() => {
    return state.challenge_id || sessionStorage.getItem('pulse_challenge_id') || '';
  });
  const [devOtp, setDevOtp] = useState<string | null>(() => {
    return state.otp_code || (state.challenge_id ? sessionStorage.getItem(`dev_otp_${state.challenge_id}`) : null) || null;
  });

  const getCleanEmail = (raw?: string | null): string => {
    if (!raw) return '';
    if (raw.toLowerCase().startsWith('v***') && raw.toLowerCase().endsWith('@gmail.com')) {
      return 'vernoxy3@gmail.com';
    }
    return raw;
  };

  const initialEmail = state.email || getCleanEmail(state.masked_email) || getCleanEmail(sessionStorage.getItem('pulse_masked_email')) || 'vernoxy3@gmail.com';
  const [displayEmail, setDisplayEmail] = useState<string>(initialEmail);

  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (state.challenge_id) {
      sessionStorage.setItem('pulse_challenge_id', state.challenge_id);
    }
    const clean = state.email || getCleanEmail(state.masked_email);
    if (clean) {
      setDisplayEmail(clean);
      sessionStorage.setItem('pulse_masked_email', clean);
    }
    if (state.otp_code) {
      setDevOtp(state.otp_code);
      if (state.challenge_id) {
        sessionStorage.setItem(`dev_otp_${state.challenge_id}`, state.otp_code);
      }
    }
  }, [state.challenge_id, state.masked_email, state.email, state.otp_code]);

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
      sessionStorage.setItem('pulse_challenge_id', response.challenge_id);
      setResendCountdown(response.resend_available_in_seconds || 60);
      setCode('');
      if (response.otp_code) {
        setDevOtp(response.otp_code);
        sessionStorage.setItem(`dev_otp_${response.challenge_id}`, response.otp_code);
      }
      if (response.masked_email) {
        const clean = getCleanEmail(response.masked_email);
        setDisplayEmail(clean);
        sessionStorage.setItem('pulse_masked_email', clean);
      }
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
      subtitle={`Enter the 6-digit verification code sent to ${displayEmail}`}
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

        {devOtp && (
          <div
            id="dev-otp-card"
            className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-center shadow-xs"
          >
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-900">
              <KeyRound className="h-3.5 w-3.5 text-blue-600" />
              <span>Security Code (OTP)</span>
            </div>
            <div className="mt-2.5 flex items-center justify-center gap-2">
              <span
                id="display-otp-value"
                className="font-mono text-2xl font-extrabold tracking-[0.25em] text-blue-950 bg-white px-3.5 py-1 rounded-lg border border-blue-200 shadow-xs select-all"
              >
                {devOtp}
              </span>
              <button
                type="button"
                id="auto-fill-otp-btn"
                onClick={() => setCode(devOtp)}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition active:scale-95 shadow-xs"
                title="Fill into input box"
              >
                Auto-fill
              </button>
              <button
                type="button"
                id="copy-otp-btn"
                onClick={() => {
                  navigator.clipboard.writeText(devOtp);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white text-blue-800 hover:bg-blue-50 transition active:scale-95 shadow-xs"
                title="Copy code"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-blue-600" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-blue-700/90">
              Your one-time password received from the server.
            </p>
          </div>
        )}

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
