import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MainLayout } from '../components/layout/MainLayout';
import { Seo } from '../components/seo/Seo';
import { Button } from '../components/ui/Button';
import { resendVerificationRequest } from '../api/auth';

const schema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email'),
});
type FormValues = z.infer<typeof schema>;

const inputClass =
  'w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';
const labelClass =
  'font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant block mb-xs';

export const ResendVerificationPage: React.FC = () => {
  const location = useLocation();
  // Prefilled when arriving from the blocked-login screen, so the address never
  // has to be retyped.
  const prefill = (location.state as { email?: string } | null)?.email ?? '';
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: prefill },
  });

  // Always the same neutral confirmation — the server never reveals whether the
  // account exists or is already confirmed (no account enumeration).
  const onSubmit = handleSubmit(async (values) => {
    try {
      await resendVerificationRequest({ email: values.email });
    } catch {
      /* swallow — response is intentionally identical regardless */
    }
    setSubmitted(true);
  });

  return (
    <MainLayout>
      <Seo title="Resend confirmation email" noindex />
      <div className="max-w-md mx-auto px-margin-mobile py-24">
        <h1 className="font-display text-headline-lg text-on-surface text-center mb-xs">
          Resend confirmation
        </h1>

        {submitted ? (
          <div className="mt-lg text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-lg">
              <span className="material-symbols-outlined text-3xl text-primary">outgoing_mail</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-sm">
              If that email needs confirming, we&apos;ve sent a new link. Please check your inbox.
            </p>
            <p className="font-body-md text-sm text-on-surface-variant mb-lg">
              It can take a minute to arrive — and do check your spam or junk folder.
            </p>
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Return to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="font-body-md text-body-md text-on-surface-variant text-center mb-xl">
              Enter your email and we&apos;ll send a fresh confirmation link.
            </p>
            <form onSubmit={onSubmit} className="space-y-md" noValidate>
              <div>
                <label className={labelClass}>Email Address</label>
                <input type="email" className={inputClass} placeholder="you@example.com" {...register('email')} />
                {errors.email && <p className="text-xs text-danger mt-xs">{errors.email.message}</p>}
              </div>
              <Button type="submit" size="lg" isLoading={isSubmitting}>
                Send confirmation link
              </Button>
            </form>
            <p className="text-center text-sm text-on-surface-variant mt-lg">
              Already confirmed?{' '}
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
