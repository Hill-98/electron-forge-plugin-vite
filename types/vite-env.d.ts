/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_PLATFORM: NodeJS.Platform
  readonly VITE_BUILD_TARGET: 'main' | 'preload' | 'renderer'
  readonly VITE_MAIN_URL_PREFIX: string
  readonly VITE_RENDERER_URL_PREFIX: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
