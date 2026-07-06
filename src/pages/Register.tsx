import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

const schema = z
  .object({
    name: z.string().min(1, 'Required'),
    email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

const inputClass =
  'w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';
const labelClass =
  'font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant block mb-xs';

export const RegisterPage: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/account';
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await registerUser(values.email, values.name, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  });

  return (
    <MainLayout>
      <div className="max-w-md mx-auto px-margin-mobile py-24">
        <h1 className="font-display text-headline-lg text-on-surface text-center mb-xs">Create your account</h1>
        <p className="font-body-md text-body-md text-on-surface-variant text-center mb-xl">
          Join Siddhatva for a considered wardrobe.
        </p>

        {serverError && (
          <div role="alert" className="mb-lg rounded-lg bg-danger/10 border border-danger/30 px-md py-sm text-sm text-danger">
            {serverError}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-md" noValidate>
          <div>
            <label className={labelClass}>Full Name</label>
            <input className={inputClass} placeholder="Alexander Sterling" {...register('name')} />
            {errors.name && <p className="text-xs text-danger mt-xs">{errors.name.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Email Address</label>
            <input type="email" className={inputClass} placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-danger mt-xs">{errors.email.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <input type="password" className={inputClass} placeholder="At least 8 characters" {...register('password')} />
            {errors.password && <p className="text-xs text-danger mt-xs">{errors.password.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Confirm Password</label>
            <input type="password" className={inputClass} placeholder="••••••••" {...register('confirmPassword')} />
            {errors.confirmPassword && (
              <p className="text-xs text-danger mt-xs">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" size="lg" isLoading={isSubmitting}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-on-surface-variant mt-lg">
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </MainLayout>
  );
};
