// In-memory access token. Never persisted (the refresh token lives in an
// httpOnly cookie), so a page reload restores the session via /auth/refresh.
let accessToken: string | null = null;

// Called when a refresh attempt fails — AuthContext wires this to clear the
// session. Redirects are handled by the route guards, not here.
let authFailureHandler: (() => void) | null = null;

export const getAccessToken = (): string | null => accessToken;
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const setAuthFailureHandler = (fn: (() => void) | null): void => {
  authFailureHandler = fn;
};
export const triggerAuthFailure = (): void => {
  authFailureHandler?.();
};
