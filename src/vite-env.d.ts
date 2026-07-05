/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the API. In dev this points at the MSW mock (default /api). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
