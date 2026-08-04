// Centralized fetch wrapper: prefixes the configured base URL, attaches the
// access token, transparently refreshes on 401, parses JSON, normalizes errors,
// and throws ApiError on any non-2xx response.
import { getAccessToken, setAccessToken, triggerAuthFailure } from './auth-token';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  // The server's optional machine-readable discriminator (e.g.
  // 'EMAIL_NOT_VERIFIED'). Present only on errors the client must branch on;
  // branch on this, never on `message`, which is human-facing copy.
  get code(): string | undefined {
    const body = this.body;
    if (body && typeof body === 'object' && 'code' in body) {
      const code = (body as { code: unknown }).code;
      return typeof code === 'string' ? code : undefined;
    }
    return undefined;
  }
}

export interface ApiFetchOptions {
  // Skip the 401→refresh→retry dance (used by login/register/refresh themselves).
  skipAuthRefresh?: boolean;
}

// Single-flight refresh: concurrent 401s share one /auth/refresh call.
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken?: string };
        if (!data.accessToken) return false;
        setAccessToken(data.accessToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: ApiFetchOptions
): Promise<T> {
  const doFetch = (): Promise<Response> => {
    const token = getAccessToken();
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: 'include', // send/receive the httpOnly refresh cookie
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  };

  let res: Response;
  try {
    res = await doFetch();
  } catch (cause) {
    throw new ApiError('Network request failed', 0, cause);
  }

  // On 401, try exactly one refresh + retry; if that fails, drop the session.
  if (res.status === 401 && !options?.skipAuthRefresh) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      try {
        res = await doFetch();
      } catch (cause) {
        throw new ApiError('Network request failed', 0, cause);
      }
    } else {
      triggerAuthFailure();
    }
  }

  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

// Serialize defined params into a query string (drops undefined/null/empty).
export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}
