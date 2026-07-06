/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the API. Relative (e.g. /api) → MSW mock; absolute http(s) URL → real server. */
  readonly VITE_API_URL?: string;
  /** Force the MSW mock even when VITE_API_URL is a real server (offline dev). */
  readonly VITE_USE_MSW?: string;
  /** GA4 measurement ID (e.g. G-XXXXXXXXXX). Unset → analytics disabled (no-op). */
  readonly VITE_GA4_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
