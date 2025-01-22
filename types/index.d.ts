import { PluginBase } from '@electron-forge/plugin-base'
import type { UserConfig as ViteConfig } from 'vite'

export type ViteUserConfig =
  | ViteConfig
  | ((mode: string) => ViteConfig | Promise<ViteConfig>)

export interface ViteInternalConfigOptions {
  main: ViteConfig
  preload: ViteConfig
  renderer: ViteConfig
}

export type ViteUserConfigs = Partial<
  Record<keyof ViteInternalConfigOptions, ViteUserConfig>
>

export interface VitePluginConfigOptions {
  configs?:
    | ViteUserConfigs
    | ((mode: string) => ViteUserConfigs | Promise<ViteUserConfigs>)
  dumpConfigs?: boolean
  manualConfigs?: boolean
}

export function defineConfig(
  configs: VitePluginConfigOptions['configs'],
): VitePluginConfigOptions['configs']

export class VitePlugin extends PluginBase<VitePluginConfigOptions> {}
