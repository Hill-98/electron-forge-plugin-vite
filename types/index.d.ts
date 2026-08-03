import { PluginBase } from '@electron-forge/plugin-base'
import type { UserConfig as ViteConfig } from 'vite'

export type ConfigObjOrFunc<T> = T | ((mode: string) => T | Promise<T>)

export type VitePluginUserConfig = ConfigObjOrFunc<ViteConfig>

export interface VitePluginConfigs {
  main: ViteConfig
  preload: ViteConfig
  renderer: ViteConfig
}

export type VitePluginUserConfigs = Partial<
  Record<keyof VitePluginConfigs, VitePluginUserConfig>
>

export interface VitePluginOptions {
  configs?: ConfigObjOrFunc<VitePluginUserConfigs>
  dumpConfigs?: boolean
  ignore?: (path: string) => boolean | null
  manualConfigs?: boolean
  preloads?: Record<string, string>
}

/**
 * @deprecated use `defineConfigs`
 */
export declare function defineConfig<
  T extends ConfigObjOrFunc<VitePluginUserConfigs>,
>(configs: T): T

export declare function defineConfigs<
  T extends ConfigObjOrFunc<VitePluginUserConfigs>,
>(configs: T): T

export declare class VitePlugin extends PluginBase<VitePluginOptions> {
  name: string
}
