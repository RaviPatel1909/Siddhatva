import { apiFetch } from './client';

export type Role = 'CUSTOMER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

// Register can legitimately come back WITHOUT a session: when the server
// enforces email verification it withholds the token until the address is
// confirmed. `verificationRequired` says which shape arrived.
export interface RegisterResponse {
  user: AuthUser;
  accessToken?: string;
  verificationRequired?: boolean;
}

// Discriminator the server sets on a 403 login when the address is unconfirmed.
// Matched on the code, never the message — messages are human-facing copy and
// change freely; this is the contract.
export const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';

const jsonInit = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const registerRequest = (input: { email: string; name: string; password: string }) =>
  apiFetch<RegisterResponse>('/auth/register', jsonInit(input), { skipAuthRefresh: true });

export const loginRequest = (input: { email: string; password: string }) =>
  apiFetch<AuthResponse>('/auth/login', jsonInit(input), { skipAuthRefresh: true });

export const logoutRequest = () =>
  apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' }, { skipAuthRefresh: true });

// 401 here triggers the wrapper's refresh, so a returning user with a valid
// refresh cookie is restored even though the access token isn't persisted.
export const meRequest = () => apiFetch<{ user: AuthUser }>('/auth/me');

// Password reset. forgot-password always resolves the same way (no enumeration);
// reset-password 400s on an invalid/expired/used token.
export const forgotPasswordRequest = (input: { email: string }) =>
  apiFetch<{ ok: boolean; message: string }>('/auth/forgot-password', jsonInit(input), {
    skipAuthRefresh: true,
  });

export const resetPasswordRequest = (input: { token: string; newPassword: string }) =>
  apiFetch<{ ok: boolean }>('/auth/reset-password', jsonInit(input), { skipAuthRefresh: true });

// Email verification. verify-email 400s on an invalid/expired/used token;
// resend-verification always resolves identically (no enumeration) and needs no
// session — an unconfirmed user can't log in, so it must work logged out.
export const verifyEmailRequest = (input: { token: string }) =>
  apiFetch<{ ok: boolean }>('/auth/verify-email', jsonInit(input), { skipAuthRefresh: true });

export const resendVerificationRequest = (input: { email: string }) =>
  apiFetch<{ ok: boolean; message: string }>('/auth/resend-verification', jsonInit(input), {
    skipAuthRefresh: true,
  });
