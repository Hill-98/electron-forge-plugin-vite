import { existsSync as exists } from 'node:fs'
import inspector from 'node:inspector'
import { builtinModules } from 'node:module'
import { resolve } from 'node:path'
import { PluginBase } from '@electron-forge/plugin-base'
import type {
  ElectronProcess,
  ForgeHookMap,
} from '@electron-forge/shared-types'
import type { RolldownWatcher } from 'rolldown'
import type { ViteDevServer } from 'vite'
import { build, createServer } from 'vite'

import type {
  defineConfig as defineConfigType,
  ViteInternalConfigOptions,
  VitePluginConfigOptions,
  ViteUserConfigs,
} from '../types'
import {
  getElectronChromeVersion,
  getElectronNodeVersion,
  isEmptyInput,
  resolveHtmlEntry,
} from './utils.ts'

const ENTRY = {
  main: [
    'src/index.js',
    'src/index.ts',
    'src/main.js',
    'src/main.ts',
    'src/main/index.js',
    'src/main/index.ts',
    'src/main/main.js',
    'src/main/main.ts',
  ],
  preload: [
    'src/preload.js',
    'src/preload.ts',
    'src/preload/index.js',
    'src/preload/index.ts',
    'src/preload/preload.js',
    'src/preload/preload.ts',
  ],
}

const isDebug = inspector.url() !== undefined

export const defineConfig: typeof defineConfigType = (config) => config

export class VitePlugin extends PluginBase<VitePluginConfigOptions> {
  name = 'VitePlugin'

  #pkgType = ''

  #viteConfigs = new Map<string, ViteInternalConfigOptions>()

  #viteServer: ViteDevServer | null = null

  #viteWatchers: RolldownWatcher[] = []

  constructor(config: VitePluginConfigOptions) {
    super(config)

    this.config ??= {}

    this.getHooks = this.getHooks.bind(this)
  }

  async #appProcessCloseHandler(appProcess: ElectronProcess): Promise<void> {
    if (appProcess.restarted) {
      return
    }
    await this.#viteServer?.close()
    await this.#closeAllViteWatcher()
  }

  async #buildAll(
    configs: Required<Parameters<typeof build>[0][]>,
  ): Promise<void> {
    for (const config of configs) {
      if (
        isEmptyInput(config.build?.lib ? config.build?.lib.entry : undefined) &&
        isEmptyInput(config.build?.rolldownOptions?.input)
      ) {
        continue
      }
      const result = await build({ ...config, configFile: false })
      if ('close' in result) {
        this.#viteWatchers.push(result)
      }
    }
  }

  async #closeAllViteWatcher() {
    while (this.#viteWatchers.length > 0) {
      const viteWatcher = this.#viteWatchers.pop()
      await viteWatcher?.close()
    }
  }

  async #mergeConfigs(
    mode: string,
    configs: ViteInternalConfigOptions,
  ): Promise<ViteInternalConfigOptions> {
    const sourcemap = isDebug && mode === 'development' ? 'inline' : false

    return {
      main: {
        envPrefix: ['MAIN_VITE_', 'VITE_'],
        publicDir: 'resources',
        ...configs.main,
        build: {
          copyPublicDir: false,
          lib: {
            entry: ENTRY.main.find((e) => exists(e)) ?? [],
            formats: this.#pkgType === 'module' ? ['es'] : ['cjs'],
            ...configs.main.build?.lib,
          },
          minify: false,
          outDir: '.vite/main',
          reportCompressedSize: false,
          rolldownOptions: {
            external:
              configs.main.build?.rolldownOptions?.external === undefined ||
              Array.isArray(configs.main.build.rolldownOptions.external)
                ? [
                    ...builtinModules,
                    ...builtinModules.map((v) => `node:${v}`),
                    'electron',
                    'electron/renderer',
                    ...(configs.main.build?.rolldownOptions?.external ?? []),
                  ]
                : configs.main.build?.rolldownOptions?.external,
            ...configs.main.build?.rolldownOptions,
          },
          sourcemap,
          ssr: true,
          target: configs.main.build?.target ?? [
            `node${await getElectronNodeVersion()}`,
          ],
          ...configs.main.build,
        },
        define: {
          ...configs.main.define,
          'import.meta.env.VITE_BUILD_TARGET': '"main"',
        },
        mode,
        resolve: {
          mainFields: ['module', 'jsnext:main', 'jsnext'],
          ...configs.main.resolve,
        },
        ssr: {
          noExternal: true,
          ...configs.main.ssr,
        },
      },
      preload: {
        envPrefix: ['PRELOAD_VITE_', 'VITE_'],
        publicDir: 'resources',
        ...configs.preload,
        build: {
          copyPublicDir: false,
          lib: {
            entry: ENTRY.preload.find((e) => exists(e)) ?? [],
            formats: ['cjs'],
            ...configs.preload.build?.lib,
          },
          minify: false,
          outDir: '.vite/preload',
          reportCompressedSize: false,
          rolldownOptions: {
            external:
              configs.preload.build?.rolldownOptions?.external === undefined ||
              Array.isArray(configs.preload.build?.rolldownOptions?.external)
                ? [
                    'electron',
                    'electron/renderer',
                    ...(configs.preload.build?.rolldownOptions?.external ?? []),
                  ]
                : configs.preload.build?.rolldownOptions?.external,
            ...configs.preload.build?.rolldownOptions,
          },
          sourcemap,
          ssr: true,
          target: configs.preload.build?.target ?? [
            `chrome${await getElectronChromeVersion()}`,
          ],
          ...configs.preload.build,
        },
        define: {
          ...configs.preload.define,
          'import.meta.env.VITE_BUILD_TARGET': '"preload"',
        },
        mode,
        ssr: {
          noExternal: true,
          ...configs.preload.ssr,
        },
      },
      renderer: {
        base: './',
        root: 'src/renderer',
        envPrefix: ['RENDERER_VITE_', 'VITE_'],
        ...configs.renderer,
        build: {
          assetsInlineLimit: 0,
          emptyOutDir: true,
          minify: false,
          modulePreload: false,
          outDir: '../../.vite/renderer',
          reportCompressedSize: false,
          rolldownOptions: {
            input: await resolveHtmlEntry('src/renderer'),
            ...configs.renderer.build?.rolldownOptions,
          },
          sourcemap,
          target: configs.renderer.build?.target ?? [
            `chrome${await getElectronChromeVersion()}`,
          ],
          ...configs.renderer.build,
        },
        define: {
          ...configs.renderer.define,
          'import.meta.env.VITE_BUILD_TARGET': '"renderer"',
        },
        mode,
      },
    }
  }

  async #resolveConfigs(mode: string): Promise<ViteInternalConfigOptions> {
    if (this.#viteConfigs.has(mode)) {
      return this.#viteConfigs.get(mode) as ViteInternalConfigOptions
    }

    let configs = this.config.configs ?? {}
    let result: ViteInternalConfigOptions = {
      main: {},
      preload: {},
      renderer: {},
    }

    if (typeof configs === 'function') {
      configs = await configs(mode)
    }

    const keys = Object.keys(result) as (keyof ViteUserConfigs)[]
    for (const key of keys) {
      if (typeof configs[key] === 'function') {
        result[key] = await configs[key](mode)
      } else {
        result[key] = configs[key] ?? {}
      }
    }

    if (!this.config.manualConfigs) {
      result = await this.#mergeConfigs(mode, result)
    }

    if (this.config.dumpConfigs || isDebug) {
      console.log(`electron forge vite plugin configs (${mode}) :`)
      console.dir(result, { depth: null })
    }

    this.#viteConfigs.set(mode, result)
    return result
  }

  async #prePackageHook(_: any, platform: string): Promise<void> {
    const root = resolve('.')
    const { main, preload, renderer } = await this.#resolveConfigs('production')

    process.env.VITE_BUILD_PLATFORM = platform
    process.env.VITE_RENDERER_URL = 'app://renderer'
    process.env.VITE_MAIN_PUBLIC_DIR =
      typeof main.publicDir === 'string'
        ? resolve(main.publicDir).replace(root, '').substring(1)
        : undefined
    process.env.VITE_RENDERER_OUT_DIR = resolve(
      renderer.root ?? '.',
      renderer.build?.outDir ?? '.',
    )
      .replace(root, '')
      .substring(1)

    await this.#buildAll([main, preload, renderer])
    await this.#closeAllViteWatcher()
  }

  async #preStartHook(): Promise<void> {
    const root = resolve('.')
    const { main, preload, renderer } =
      await this.#resolveConfigs('development')

    process.env.VITE_BUILD_PLATFORM = process.platform
    process.env.VITE_MAIN_PUBLIC_DIR =
      typeof main.publicDir === 'string'
        ? resolve(main.publicDir).replace(root, '').substring(1)
        : undefined

    if (this.#viteServer === null) {
      this.#viteServer = await createServer({ ...renderer, configFile: false })
    }
    await this.#viteServer.listen()
    const address = this.#viteServer.httpServer?.address()
    if (typeof address === 'string') {
      // noinspection HttpUrlsUsage
      process.env.VITE_RENDERER_URL = `http://${address}`
    } else {
      process.env.VITE_RENDERER_URL = `http://localhost:${address?.port ?? 5173}`
    }
    await this.#buildAll([main, preload])
  }

  async #postStartHook(_: any, appProcess: ElectronProcess): Promise<void> {
    appProcess.once(
      'close',
      this.#appProcessCloseHandler.bind(this, appProcess),
    )
  }

  async #readPackageJsonHook(_: any, pkg: Record<string, any>): Promise<any> {
    this.#pkgType = pkg.type ?? ''
    return pkg
  }

  override getHooks(): ForgeHookMap {
    return {
      prePackage: this.#prePackageHook.bind(this),
      preStart: this.#preStartHook.bind(this),
      postStart: this.#postStartHook.bind(this),
      readPackageJson: this.#readPackageJsonHook.bind(this),
    }
  }
}
