import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MainLayout } from '../components/layout/MainLayout';
import { Seo } from '../components/seo/Seo';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { EMAIL_NOT_VERIFIED } from '../api/auth';
import { useResendVerification } from '../lib/useResendVerification';

const schema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email'),
  password: z.string().min(1, 'Required'),
});
type FormValues = z.infer<typeof schema>;

const inputClass =
  'w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';
const labelClass =
  'font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant block mb-xs';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as { from?: { pathname?: string }; notice?: string } | null;
  const from = locState?.from?.pathname ?? '/account';
  const [serverError, setServerError] = useState<string | null>(null);
  // Credentials were correct but the address is unconfirmed. Tracked separately
  // from serverError because it isn't a failure the user can fix by retyping —
  // it needs its own explanation and a way out.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  // Same hook the post-registration screen uses, so both resend paths share one
  // cooldown behaviour rather than drifting apart.
  const resend = useResendVerification(unverifiedEmail);
  // One-time notice passed from e.g. a successful password reset.
  const notice = locState?.notice ?? null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setUnverifiedEmail(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      // Branch on the server's code, not its message — the message is copy.
      if (err instanceof ApiError && err.code === EMAIL_NOT_VERIFIED) {
        setUnverifiedEmail(values.email);
        return;
      }
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  });

  return (
    <MainLayout>
      <Seo title="Sign In" noindex />
      <div className="max-w-md mx-auto px-margin-mobile py-24">
        <h1 className="font-display text-headline-lg text-on-surface text-center mb-xs">Welcome back</h1>
        <p className="font-body-md text-body-md text-on-surface-variant text-center mb-xl">
          Sign in to your Siddhatva account.
        </p>

        {notice && (
          <div role="status" className="mb-lg rounded-lg bg-success/10 border border-success/30 px-md py-sm text-sm text-success">
            {notice}
          </div>
        )}

        {serverError && (
          <div role="alert" className="mb-lg rounded-lg bg-danger/10 border border-danger/30 px-md py-sm text-sm text-danger">
            {serverError}
          </div>
        )}

        {/* Correct password, unconfirmed address. Explain it, and give a way
            through on this screen — the address is already typed, so asking the
            user to go and re-enter it elsewhere would be needless friction. */}
        {unverifiedEmail && (
          <div
            role="alert"
            data-testid="login-unverified"
            className="mb-lg rounded-lg bg-warning/10 border border-warning/30 px-md py-md"
          >
            <div className="flex items-start gap-sm">
              <span className="material-symbols-outlined text-xl text-warning shrink-0">mark_email_unread</span>
              <div>
                <p className="font-body-md text-sm text-on-surface font-semibold mb-xs">
                  Confirm your email to sign in
                </p>
                <p className="font-body-md text-sm text-on-surface-variant mb-xs">
                  We sent a confirmation link to <span className="font-semibold">{unverifiedEmail}</span>.
                  Open it to activate your account.
                </p>
                <p className="font-body-md text-xs text-on-surface-variant mb-sm">
                  Can&apos;t find it? Check your spam or junk folder — it sometimes lands there.
                </p>
                {resend.status === 'sent' && (
                  <p role="status" className="font-body-md text-sm text-success font-semibold mb-xs">
                    Sent. Check your inbox (and spam).
                  </p>
                )}
                <button
                  type="button"
                  onClick={resend.resend}
                  disabled={resend.disabled}
                  data-testid="login-resend"
                  className="text-primary font-semibold text-sm hover:underline disabled:opacity-60 disabled:no-underline"
                >
                  {resend.status === 'sending'
                    ? 'Sending…'
                    : resend.secondsLeft > 0
                      ? `Resend in ${resend.secondsLeft}s`
                      : 'Resend confirmation email'}
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-md" noValidate>
          <div>
            <label className={labelClass}>Email Address</label>
            <input type="email" className={inputClass} placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-danger mt-xs">{errors.email.message}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-xs">
              <label className={`${labelClass} mb-0`}>Password</label>
              <Link to="/forgot-password" className="text-xs text-primary font-medium hover:underline">
                Forgot password?
              </Link>
            </div>
            <input type="password" className={inputClass} placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="text-xs text-danger mt-xs">{errors.password.message}</p>}
          </div>
          <Button type="submit" size="lg" isLoading={isSubmitting}>
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-on-surface-variant mt-lg">
          New to Siddhatva?{' '}
          <Link to="/register" state={location.state} className="text-primary font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </MainLayout>
  );
};
