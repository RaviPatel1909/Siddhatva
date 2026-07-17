import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AccountLayout } from '../../components/layout/AccountLayout';
import { Seo } from '../../components/seo/Seo';
import { Button } from '../../components/ui/Button';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { forgotPasswordRequest } from '../../api/auth';

const cardClass = 'bg-surface-container-low rounded-xl border border-outline-variant/20 p-lg md:p-xl';
const sectionTitleClass = 'font-display text-headline-md text-primary';

// Initials for the identity avatar — first letter of the first two name words.
const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '·';

type ResetState = 'idle' | 'sending' | 'sent' | 'error';

const NOTIFICATION_STREAMS = [
  { icon: 'receipt_long', title: 'Order confirmations', description: 'Sent when your payment is confirmed.' },
  { icon: 'local_shipping', title: 'Shipping updates', description: 'Sent when your order is dispatched.' },
] as const;

export const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { reduceMotion, setReduceMotion } = usePreferences();

  const [resetState, setResetState] = useState<ResetState>('idle');
  const [signingOut, setSigningOut] = useState(false);

  // Reuse the real, enumeration-safe reset flow: email the user a link. Completing
  // it sets a new password AND revokes every refresh token (all sessions logout).
  const sendResetLink = async () => {
    if (!user) return;
    setResetState('sending');
    try {
      await forgotPasswordRequest({ email: user.email });
      setResetState('sent');
    } catch {
      setResetState('error');
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    await logout();
    navigate('/');
  };

  if (!user) return null; // ProtectedRoute guarantees a user; satisfies the type

  return (
    <AccountLayout>
      <Seo title="Settings" noindex />

      <div className="mb-xl">
        <h1 className="font-display text-3xl text-primary">Settings</h1>
        <p className="font-body-md text-sm text-on-surface-variant mt-xs">
          Manage your account, security, and preferences.
        </p>
      </div>

      <div className="space-y-xl max-w-3xl">
        {/* ── Account ─────────────────────────────────────────────── */}
        <section className={cardClass} aria-labelledby="settings-account">
          <h2 id="settings-account" className={`${sectionTitleClass} mb-lg`}>
            Account
          </h2>

          <div className="flex items-center gap-lg">
            <div
              aria-hidden
              className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-display text-xl shrink-0"
            >
              {initialsOf(user.name)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-on-surface truncate">{user.name}</p>
              <p className="text-sm text-on-surface-variant truncate">{user.email}</p>
              <span className="inline-flex items-center gap-xs mt-xs rounded-full bg-secondary-container/60 px-sm py-[2px] text-[11px] uppercase tracking-widest text-on-secondary-container">
                <span className="material-symbols-outlined text-[14px]">
                  {user.role === 'ADMIN' ? 'shield_person' : 'person'}
                </span>
                {user.role === 'ADMIN' ? 'Administrator' : 'Customer'}
              </span>
            </div>
          </div>

          <p className="text-xs text-on-surface-variant mt-lg">
            Need to update your name or email? Contact{' '}
            <Link to="/contact" className="text-primary hover:underline">
              our team
            </Link>
            .
          </p>

          <div className="flex justify-end pt-lg mt-lg border-t border-outline-variant/20">
            <Button variant="secondary" size="md" onClick={signOut} isLoading={signingOut}>
              Sign out
            </Button>
          </div>
        </section>

        {/* ── Security ────────────────────────────────────────────── */}
        <section className={cardClass} aria-labelledby="settings-security">
          <h2 id="settings-security" className={`${sectionTitleClass} mb-sm`}>
            Security
          </h2>
          <p className="text-sm text-on-surface-variant mb-lg">Password</p>

          {resetState === 'sent' ? (
            <div className="flex items-start gap-md rounded-lg border border-primary/30 bg-primary/5 p-md">
              <span className="material-symbols-outlined text-primary shrink-0">mark_email_read</span>
              <div>
                <p className="font-medium text-on-surface">Check your inbox</p>
                <p className="text-sm text-on-surface-variant">
                  If an account exists for {user.email}, we&apos;ve sent a link to set a new password.
                  It expires in 1 hour and signs you out of all devices.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md rounded-lg border border-outline-variant/20 p-md">
              <div className="flex items-start gap-md">
                <span className="material-symbols-outlined text-primary shrink-0">lock_reset</span>
                <div>
                  <p className="font-medium text-on-surface">Change your password</p>
                  <p className="text-sm text-on-surface-variant">
                    We&apos;ll email a secure reset link to {user.email}. Completing it signs you out
                    of every device.
                  </p>
                  {resetState === 'error' && (
                    <p className="text-xs text-danger mt-xs">
                      Something went wrong. Please try again.
                    </p>
                  )}
                </div>
              </div>
              <div className="shrink-0 sm:pl-md">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={sendResetLink}
                  isLoading={resetState === 'sending'}
                >
                  Send reset link
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* ── Notifications ───────────────────────────────────────── */}
        <section className={cardClass} aria-labelledby="settings-notifications">
          <h2 id="settings-notifications" className={`${sectionTitleClass} mb-sm`}>
            Notifications
          </h2>
          <p className="text-sm text-on-surface-variant mb-lg">
            We send transactional emails to <span className="text-on-surface">{user.email}</span> so
            you can follow your purchases. These keep you informed and can&apos;t be turned off.
          </p>
          <ul className="space-y-md">
            {NOTIFICATION_STREAMS.map((stream) => (
              <li
                key={stream.title}
                className="flex items-center gap-md p-md rounded-lg border border-outline-variant/20"
              >
                <span className="material-symbols-outlined text-primary">{stream.icon}</span>
                <div className="min-w-0">
                  <p className="font-medium text-on-surface">{stream.title}</p>
                  <p className="text-sm text-on-surface-variant">{stream.description}</p>
                </div>
                <span className="ml-auto text-xs uppercase tracking-widest text-on-surface-variant">
                  On
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Preferences ─────────────────────────────────────────── */}
        <section className={cardClass} aria-labelledby="settings-preferences">
          <h2 id="settings-preferences" className={`${sectionTitleClass} mb-lg`}>
            Preferences
          </h2>
          <div className="flex items-center justify-between gap-md p-md rounded-lg border border-outline-variant/20">
            <div className="flex items-start gap-md min-w-0">
              <span className="material-symbols-outlined text-primary">motion_photos_off</span>
              <div>
                <p className="font-medium text-on-surface">Reduce motion</p>
                <p className="text-sm text-on-surface-variant">
                  Minimize animations and transitions across the site. Your device&apos;s
                  reduced-motion setting is always respected too.
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={reduceMotion}
              onChange={setReduceMotion}
              label="Reduce motion"
            />
          </div>
        </section>

        {/* ── Privacy ─────────────────────────────────────────────── */}
        <section className={cardClass} aria-labelledby="settings-privacy">
          <h2 id="settings-privacy" className={`${sectionTitleClass} mb-lg`}>
            Privacy
          </h2>
          <Link
            to="/privacy"
            className="flex items-center gap-md p-md rounded-lg border border-outline-variant/20 hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-primary">policy</span>
            <div className="min-w-0">
              <p className="font-medium text-on-surface">Privacy Policy</p>
              <p className="text-sm text-on-surface-variant">
                Read how we collect, use, and protect your data.
              </p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant ml-auto">
              chevron_right
            </span>
          </Link>
        </section>
      </div>
    </AccountLayout>
  );
};
