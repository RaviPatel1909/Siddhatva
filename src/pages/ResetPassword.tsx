import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MainLayout } from '../components/layout/MainLayout';
import { Seo } from '../components/seo/Seo';
import { Button } from '../components/ui/Button';
import { resetPasswordRequest } from '../api/auth';
import { ApiError } from '../api/client';

// newPassword mirrors the register policy (min 8); confirm must match.
const schema = z
  .object({
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });
type FormValues = z.infer<typeof schema>;

const inputClass =
  'w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';
const labelClass =
  'font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant block mb-xs';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [tokenRejected, setTokenRejected] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await resetPasswordRequest({ token, newPassword: values.newPassword });
      // Success → send to login with a one-time notice.
      navigate('/login', {
        replace: true,
        state: { notice: 'Your password has been reset. Please sign in with your new password.' },
      });
    } catch (err) {
      // A bad/expired/used token → offer a path to request a fresh link.
      if (err instanceof ApiError && err.status === 400) {
        setTokenRejected(true);
      } else {
        setServerError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      }
    }
  });

  const invalidLink = !token || tokenRejected;

  return (
    <MainLayout>
      <Seo title="Set a New Password" noindex />
      <div className="max-w-md mx-auto px-margin-mobile py-24">
        <h1 className="font-display text-headline-lg text-on-surface text-center mb-xs">Set a new password</h1>

        {invalidLink ? (
          <div className="mt-lg text-center">
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-lg">
              <span className="material-symbols-outlined text-3xl text-danger">link_off</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
              This password reset link is invalid or has expired. Request a new one to continue.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block bg-primary text-on-primary px-xl py-md rounded-lg font-label-sm text-sm uppercase tracking-widest font-semibold hover:opacity-90 transition-all"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <>
            <p className="font-body-md text-body-md text-on-surface-variant text-center mb-xl">
              Choose a new password for your account.
            </p>
            {serverError && (
              <div role="alert" className="mb-lg rounded-lg bg-danger/10 border border-danger/30 px-md py-sm text-sm text-danger">
                {serverError}
              </div>
            )}
            <form onSubmit={onSubmit} className="space-y-md" noValidate>
              <div>
                <label className={labelClass}>New Password</label>
                <input type="password" className={inputClass} placeholder="••••••••" {...register('newPassword')} />
                {errors.newPassword && <p className="text-xs text-danger mt-xs">{errors.newPassword.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Confirm Password</label>
                <input type="password" className={inputClass} placeholder="••••••••" {...register('confirm')} />
                {errors.confirm && <p className="text-xs text-danger mt-xs">{errors.confirm.message}</p>}
              </div>
              <Button type="submit" size="lg" isLoading={isSubmitting}>
                Reset password
              </Button>
            </form>
          </>
        )}
      </div>
    </MainLayout>
  );
};
