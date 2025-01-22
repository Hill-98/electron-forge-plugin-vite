/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RENDERER_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
