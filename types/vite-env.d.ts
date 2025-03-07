/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_PLATFORM: NodeJS.Platform
  readonly VITE_BUILD_TARGET: 'main' | 'preload' | 'renderer'
  readonly VITE_RENDERER_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
