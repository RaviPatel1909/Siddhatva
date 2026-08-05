import { useCallback, useEffect, useRef, useState } from 'react';
import { resendVerificationRequest } from '../api/auth';

export type ResendStatus = 'idle' | 'sending' | 'sent';

// Seconds the button stays locked after a send. The endpoint is rate-limited
// (20 / 15 min per IP) with no-enumeration semantics, and a user who can't find
// the email will click repeatedly — without a cooldown they'd spend that budget
// in seconds and start getting 429s, which looks like the site is broken. Long
// enough that the mail has a chance to land, short enough not to feel punitive.
export const RESEND_COOLDOWN_SECONDS = 30;

interface UseResendVerification {
  status: ResendStatus;
  secondsLeft: number;
  disabled: boolean;
  resend: () => Promise<void>;
}

// Shared "resend the confirmation email" behaviour: one in-flight request at a
// time, then a visible countdown before another is allowed.
export function useResendVerification(email: string | null): UseResendVerification {
  const [status, setStatus] = useState<ResendStatus>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    []
  );

  const resend = useCallback(async () => {
    if (!email || status === 'sending' || secondsLeft > 0) return;
    setStatus('sending');
    try {
      await resendVerificationRequest({ email });
    } catch {
      // The response is intentionally identical whether or not the address
      // exists or is already confirmed. Surfacing a failure here would leak
      // that distinction, so the UI reports "sent" either way.
    }
    setStatus('sent');
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [email, status, secondsLeft]);

  return {
    status,
    secondsLeft,
    disabled: status === 'sending' || secondsLeft > 0,
    resend,
  };
}
