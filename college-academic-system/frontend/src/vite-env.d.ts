/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override the API base URL; defaults to the dev-server proxy at /api. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
