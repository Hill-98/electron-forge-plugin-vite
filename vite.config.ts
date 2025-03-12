import { builtinModules } from 'node:module'
import { defineConfig } from 'vite'
import pkg from './package.json'

export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron'

  return {
    build: {
      emptyOutDir: !isElectron,
      outDir: 'dist',
      target: ['node16'],
      minify: false,
      lib: {
        entry: isElectron ? 'src/electron-protocol-helper.ts' : 'src/index.ts',
        formats: isElectron ? ['es'] : ['cjs'],
        fileName(format, entryName) {
          return entryName.concat(format === 'es' ? '.mjs' : '.js')
        },
      },
      reportCompressedSize: false,
      rollupOptions: {
        external: [
          ...builtinModules,
          ...builtinModules.map((v) => `node:${v}`),
          ...Object.keys(pkg.dependencies),
          ...Object.keys(pkg.peerDependencies),
          'electron',
        ],
      },
    },
    define: {
      'import.meta.env.VITE_MAIN_PUBLIC_DIR':
        'import.meta.env.VITE_MAIN_PUBLIC_DIR',
      'import.meta.env.VITE_RENDERER_OUT_DIR':
        'import.meta.env.VITE_RENDERER_OUT_DIR',
    },
  }
})
