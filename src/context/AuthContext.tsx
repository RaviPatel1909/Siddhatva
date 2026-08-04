import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, loginRequest, logoutRequest, meRequest, registerRequest, Role } from '../api/auth';
import { setAccessToken, setAuthFailureHandler } from '../api/auth-token';

interface AuthContextValue {
  user: AuthUser | null;
  role: Role | null;
  loading: boolean; // true until the initial session check resolves
  login: (email: string, password: string) => Promise<AuthUser>;
  // Resolves `verificationRequired: true` when the server withheld the session
  // pending email confirmation — in that case no user is signed in and the
  // caller should show "check your inbox" rather than navigating to the account.
  register: (
    email: string,
    name: string,
    password: string
  ) => Promise<{ user: AuthUser; verificationRequired: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore the session: GET /auth/me 401s without an access token,
  // which the fetch wrapper answers with a cookie-based refresh + retry.
  useEffect(() => {
    setAuthFailureHandler(() => {
      setAccessToken(null);
      setUser(null);
    });
    let active = true;
    meRequest()
      .then((res) => active && setUser(res.user))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      setAuthFailureHandler(null);
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const res = await loginRequest({ email, password });
    setAccessToken(res.accessToken);
    setUser(res.user);
    return res.user;
  };

  const register = async (
    email: string,
    name: string,
    password: string
  ): Promise<{ user: AuthUser; verificationRequired: boolean }> => {
    const res = await registerRequest({ email, name, password });
    // With verification enforced the server returns no accessToken — signing in
    // is deferred until the address is confirmed, so leave the session empty
    // rather than half-populating it with a user and no token.
    if (res.verificationRequired || !res.accessToken) {
      return { user: res.user, verificationRequired: true };
    }
    setAccessToken(res.accessToken);
    setUser(res.user);
    return { user: res.user, verificationRequired: false };
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutRequest();
    } catch {
      /* clear locally regardless */
    }
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
