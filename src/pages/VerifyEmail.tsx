import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Seo } from '../components/seo/Seo';
import { verifyEmailRequest } from '../api/auth';

type Status = 'verifying' | 'verified' | 'invalid';

export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'invalid');
  // The token is single-use, so it must be spent exactly once. React 18 mounts
  // effects twice in StrictMode, which would spend it and then report the second
  // (now-used) attempt as invalid.
  const consumed = useRef(false);

  useEffect(() => {
    if (!token || consumed.current) return;
    consumed.current = true;
    let active = true;
    verifyEmailRequest({ token })
      .then(() => active && setStatus('verified'))
      .catch(() => active && setStatus('invalid'));
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <MainLayout>
      <Seo title="Confirm your email" noindex />
      <div className="max-w-md mx-auto px-margin-mobile py-24 text-center">
        {status === 'verifying' && (
          <>
            <h1 className="font-display text-headline-lg text-on-surface mb-xs">Confirming your email</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">One moment…</p>
          </>
        )}

        {status === 'verified' && (
          <>
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-lg">
              <span className="material-symbols-outlined text-3xl text-success">mark_email_read</span>
            </div>
            <h1 className="font-display text-headline-lg text-on-surface mb-xs">Email confirmed</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
              Thank you — your email address is confirmed. You can now sign in to your account.
            </p>
            <Link
              to="/login"
              state={{ notice: 'Your email is confirmed. Please sign in.' }}
              className="inline-block bg-primary text-on-primary px-xl py-md rounded-lg font-label-sm text-sm uppercase tracking-widest font-semibold hover:opacity-90 transition-all"
            >
              Sign in
            </Link>
          </>
        )}

        {status === 'invalid' && (
          <>
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-lg">
              <span className="material-symbols-outlined text-3xl text-danger">link_off</span>
            </div>
            <h1 className="font-display text-headline-lg text-on-surface mb-xs">Link expired</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
              This confirmation link is invalid, has already been used, or has expired. Request a
              fresh one and we&apos;ll send another.
            </p>
            <Link
              to="/resend-verification"
              className="inline-block bg-primary text-on-primary px-xl py-md rounded-lg font-label-sm text-sm uppercase tracking-widest font-semibold hover:opacity-90 transition-all"
            >
              Send a new link
            </Link>
          </>
        )}
      </div>
    </MainLayout>
  );
};
