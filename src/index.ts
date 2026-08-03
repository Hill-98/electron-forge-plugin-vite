import { existsSync as exists } from 'node:fs'
import { readFile } from 'node:fs/promises'
import inspector from 'node:inspector'
import { builtinModules, createRequire } from 'node:module'
import { relative, resolve } from 'node:path'
import { PluginBase } from '@electron-forge/plugin-base'
import type {
  ElectronProcess,
  ForgeHookMap,
} from '@electron-forge/shared-types'
import type { RolldownWatcher } from 'rolldown'
import { build, createServer } from 'vite'
import type {
  defineConfigs as defineConfigsType,
  VitePluginConfigs,
  VitePluginOptions,
  VitePluginUserConfigs,
} from '../types/index.d.ts'
import {
  getElectronChromeVersion,
  getElectronNodeVersion,
  isEmptyInput,
  MERGE_ARRAY_SYMBOL,
  mergeDefaults,
  resolveHtmlEntry,
} from './utils.ts'

interface PackageConfig {
  isModule?: boolean
  nativeDependencies?: string[]
}

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  files?: string[]
  napi?: object
  optionalDependencies?: Record<string, string>
  type?: string
}

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

export const defineConfig: typeof defineConfigsType = (config) => config

export const defineConfigs: typeof defineConfigsType = (configs) => configs

export class VitePlugin extends PluginBase<VitePluginOptions> {
  name = 'VitePlugin'

  #packageConfig?: PackageConfig

  #viteConfigs = new Map<string, VitePluginConfigs>()

  #viteServer: Awaited<ReturnType<typeof createServer>> | null = null

  #viteWatchers: RolldownWatcher[] = []

  constructor(config: VitePluginOptions) {
    super(config)

    this.config ??= {}

    this.getHooks = this.getHooks.bind(this)
  }

  async #appProcessCloseHandler(appProcess: ElectronProcess): Promise<void> {
    if (appProcess.restarted) {
      const { main, preload } = await this.#resolveConfigs('development')
      await this.#buildAll([main])
      await this.#buildPreloads(preload)
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
        isEmptyInput(config.input) &&
        isEmptyInput(config.build?.lib ? config.build?.lib.entry : []) &&
        isEmptyInput(config.build?.rolldownOptions?.input)
      ) {
        continue
      }
      const result = await build({
        ...config,
        clearScreen: false,
        configFile: false,
      })
      if ('close' in result) {
        this.#viteWatchers.push(result)
      }
    }
  }

  async #buildPreloads(config: VitePluginConfigs['preload']): Promise<void> {
    const { preloads } = this.config
    const keys = preloads ? (Object.keys(preloads) as string[]) : []
    if (typeof preloads !== 'object' || keys.length === 0) {
      return this.#buildAll([config])
    }
    const configs = keys.map((key, i) => ({
      ...config,
      build: {
        ...config.build,
        emptyOutDir: i === 0,
        lib: {
          ...config.build?.lib,
          entry: { [key]: preloads[key] as string },
        },
      },
    }))
    return this.#buildAll(configs)
  }

  async #closeAllViteWatcher() {
    while (this.#viteWatchers.length > 0) {
      const viteWatcher = this.#viteWatchers.pop()
      await viteWatcher?.close()
    }
  }

  async #mergeConfigs(
    mode: string,
    configs: VitePluginConfigs,
  ): Promise<VitePluginConfigs> {
    const isDev = mode === 'development'
    const attachDebugInfo = isDev ? 'full' : 'none'
    const sourcemap = isDebug && isDev ? 'inline' : false
    const mainEntry = ENTRY.main.find((e) => exists(e))
    const preloadEntry = ENTRY.preload.find((e) => exists(e))

    return {
      main: {
        envPrefix: ['MAIN_VITE_', 'VITE_'],
        publicDir: 'resources',
        ...configs.main,
        build: mergeDefaults(
          {
            copyPublicDir: false,
            lib: {
              entry: mainEntry ? { index: mainEntry } : [],
              formats: this.#packageConfig?.isModule ? ['es'] : ['cjs'],
            },
            minify: false,
            outDir: '.vite/main',
            reportCompressedSize: false,
            rolldownOptions: {
              experimental: {
                attachDebugInfo,
              },
              external: [
                MERGE_ARRAY_SYMBOL,
                ...builtinModules,
                ...builtinModules.map((v) => `node:${v}`),
                ...(this.#packageConfig?.nativeDependencies ?? []),
                'electron',
                'electron/renderer',
              ],
              output: {
                comments: isDev,
              },
            },
            sourcemap,
            ssr: true,
            target: [`node${await getElectronNodeVersion()}`],
          },
          configs.main.build,
        ),
        define: {
          ...configs.main.define,
          'import.meta.env.VITE_BUILD_TARGET': '"main"',
        },
        mode,
        ssr: {
          noExternal: true,
          ...configs.main.ssr,
        },
      },
      preload: {
        envPrefix: ['PRELOAD_VITE_', 'VITE_'],
        publicDir: false,
        ...configs.preload,
        build: mergeDefaults(
          {
            lib: {
              entry: preloadEntry ? { index: preloadEntry } : [],
              formats: ['cjs'],
            },
            minify: false,
            outDir: '.vite/preload',
            reportCompressedSize: false,
            rolldownOptions: {
              experimental: {
                attachDebugInfo,
              },
              external: [MERGE_ARRAY_SYMBOL, 'electron', 'electron/renderer'],
              output: {
                comments: isDev,
                codeSplitting: false,
                entryFileNames: '[name].js',
              },
              treeshake: {
                moduleSideEffects: 'no-external',
              },
            },
            sourcemap,
            ssr: true,
            target: [`chrome${await getElectronChromeVersion()}`],
          },
          configs.preload.build,
        ),
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
        input: await resolveHtmlEntry('src/renderer'),
        ...configs.renderer,
        build: mergeDefaults(
          {
            assetsInlineLimit: 0,
            emptyOutDir: true,
            minify: false,
            modulePreload: false,
            outDir: '../../.vite/renderer',
            reportCompressedSize: false,
            rolldownOptions: {
              experimental: {
                attachDebugInfo,
              },
              output: {
                comments: isDev,
              },
            },
            sourcemap,
            target: [`chrome${await getElectronChromeVersion()}`],
          },
          configs.renderer.build,
        ),
        define: {
          ...configs.renderer.define,
          'import.meta.env.VITE_BUILD_TARGET': '"renderer"',
        },
        mode,
      },
    }
  }

  async #readPackageJson(): Promise<void> {
    const pkg: PackageJson = JSON.parse(await readFile('package.json', 'utf-8'))
    const require = createRequire(import.meta.url)
    const result = {
      isModule: pkg.type === 'module',
      nativeDependencies: [] as string[],
    }
    for (const dep of [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]) {
      try {
        const depPkg: PackageJson = exists(`node_modules/${dep}/package.json`)
          ? await readFile(`node_modules/${dep}/package.json`, 'utf-8').then(
              (content) => JSON.parse(content),
            )
          : require(`${dep}/package.json`)
        if (
          typeof depPkg.napi === 'object' ||
          (depPkg.files ?? []).some((file) => file.endsWith('binding.gyp')) ||
          exists(`node_modules/${dep}/binding.gyp`)
        ) {
          result.nativeDependencies.push(
            dep,
            ...Object.keys(depPkg.optionalDependencies ?? {}),
          )
        }
      } catch {}
    }
    this.#packageConfig = result
  }

  #relativePath(root: string, path: string): string {
    return relative(resolve(root), resolve(root, path))
  }

  async #resolveConfigs(mode: string): Promise<VitePluginConfigs> {
    if (!this.#packageConfig) {
      await this.#readPackageJson()
    }
    if (this.#viteConfigs.has(mode)) {
      return this.#viteConfigs.get(mode) as VitePluginConfigs
    }

    let configs = this.config.configs ?? {}
    let result: VitePluginConfigs = {
      main: {},
      preload: {},
      renderer: {},
    }
    if (typeof configs === 'function') {
      configs = await configs(mode)
    }
    const keys = Object.keys(result) as (keyof VitePluginUserConfigs)[]
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
    this.#viteConfigs.set(mode, result)
    if (this.config.dumpConfigs || isDebug) {
      console.log(`electron forge vite plugin configs (${mode}) :`)
      console.dir(result, { depth: null })
    }
    return result
  }

  async #prePackageHook(_: any, platform: string): Promise<void> {
    const { main, preload, renderer } = await this.#resolveConfigs('production')

    process.env.VITE_BUILD_PLATFORM = platform
    process.env.VITE_RENDERER_URL = 'app://renderer'
    process.env.VITE_MAIN_PUBLIC_DIR =
      typeof main.publicDir === 'string'
        ? this.#relativePath(main.root ?? '.', main.publicDir)
        : undefined
    process.env.VITE_RENDERER_OUT_DIR = this.#relativePath(
      renderer.root ?? '.',
      renderer.build?.outDir ?? '.',
    )

    await this.#buildAll([main, renderer])
    await this.#buildPreloads(preload)
    await this.#closeAllViteWatcher()
  }

  async #preStartHook(): Promise<void> {
    const { main, preload, renderer } =
      await this.#resolveConfigs('development')

    process.env.VITE_BUILD_PLATFORM = process.platform
    process.env.VITE_MAIN_PUBLIC_DIR =
      typeof main.publicDir === 'string'
        ? this.#relativePath(main.root ?? '.', main.publicDir)
        : undefined

    if (this.#viteServer === null) {
      this.#viteServer = await createServer({
        ...renderer,
        clearScreen: false,
        configFile: false,
      })
    }
    await this.#viteServer.listen()
    const address = this.#viteServer.httpServer?.address()
    if (typeof address === 'string') {
      // noinspection HttpUrlsUsage
      process.env.VITE_RENDERER_URL = `http://${address}`
    } else {
      process.env.VITE_RENDERER_URL = `http://localhost:${address?.port ?? 5173}`
    }
    await this.#buildAll([main])
    await this.#buildPreloads(preload)
  }

  async #postStartHook(_: any, appProcess: ElectronProcess): Promise<void> {
    appProcess.once(
      'close',
      this.#appProcessCloseHandler.bind(this, appProcess),
    )
  }

  override getHooks(): ForgeHookMap {
    return {
      prePackage: this.#prePackageHook.bind(this),
      preStart: this.#preStartHook.bind(this),
      postStart: this.#postStartHook.bind(this),
    }
  }
}
