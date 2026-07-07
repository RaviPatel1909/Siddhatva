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
  // One-time notice passed from e.g. a successful password reset.
  const notice = locState?.notice ?? null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
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
