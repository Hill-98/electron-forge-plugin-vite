/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_PLATFORM: NodeJS.Platform
  readonly VITE_RENDERER_URL: string
}

// biome-ignore lint/correctness/noUnusedVariables: <explanation>
interface ImportMeta {
  readonly env: ImportMetaEnv
}
