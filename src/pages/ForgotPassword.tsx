import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MainLayout } from '../components/layout/MainLayout';
import { Seo } from '../components/seo/Seo';
import { Button } from '../components/ui/Button';
import { forgotPasswordRequest } from '../api/auth';

const schema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email'),
});
type FormValues = z.infer<typeof schema>;

const inputClass =
  'w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';
const labelClass =
  'font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant block mb-xs';

export const ForgotPasswordPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onTouched' });

  // Always show the same neutral confirmation — the server never reveals whether
  // the email exists (no account enumeration).
  const onSubmit = handleSubmit(async (values) => {
    try {
      await forgotPasswordRequest({ email: values.email });
    } catch {
      /* swallow — response is intentionally identical regardless */
    }
    setSubmitted(true);
  });

  return (
    <MainLayout>
      <Seo title="Reset Password" noindex />
      <div className="max-w-md mx-auto px-margin-mobile py-24">
        <h1 className="font-display text-headline-lg text-on-surface text-center mb-xs">Reset your password</h1>

        {submitted ? (
          <div className="mt-lg text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-lg">
              <span className="material-symbols-outlined text-3xl text-primary">mark_email_read</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
              If an account exists for that email, we&apos;ve sent a link to reset your password.
              Please check your inbox.
            </p>
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Return to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="font-body-md text-body-md text-on-surface-variant text-center mb-xl">
              Enter your email and we&apos;ll send you a link to set a new password.
            </p>
            <form onSubmit={onSubmit} className="space-y-md" noValidate>
              <div>
                <label className={labelClass}>Email Address</label>
                <input type="email" className={inputClass} placeholder="you@example.com" {...register('email')} />
                {errors.email && <p className="text-xs text-danger mt-xs">{errors.email.message}</p>}
              </div>
              <Button type="submit" size="lg" isLoading={isSubmitting}>
                Send reset link
              </Button>
            </form>
            <p className="text-center text-sm text-on-surface-variant mt-lg">
              Remembered it?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </MainLayout>
  );
};
