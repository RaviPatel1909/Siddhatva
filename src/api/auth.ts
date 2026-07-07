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

const jsonInit = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const registerRequest = (input: { email: string; name: string; password: string }) =>
  apiFetch<AuthResponse>('/auth/register', jsonInit(input), { skipAuthRefresh: true });

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
