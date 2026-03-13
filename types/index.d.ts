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

export declare function defineConfig<
  T extends VitePluginConfigOptions['configs'],
>(configs: T): T

export declare class VitePlugin extends PluginBase<VitePluginConfigOptions> {
  name: string
}
