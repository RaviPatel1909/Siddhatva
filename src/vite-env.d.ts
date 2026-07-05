/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the API. Relative (e.g. /api) → MSW mock; absolute http(s) URL → real server. */
  readonly VITE_API_URL?: string;
  /** Force the MSW mock even when VITE_API_URL is a real server (offline dev). */
  readonly VITE_USE_MSW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
