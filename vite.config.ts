import { builtinModules } from 'node:module'
import { defineConfig } from 'vite'
import pkg from './package.json'

export default defineConfig({
  build: {
    outDir: 'dist',
    target: ['node16'],
    minify: false,
    lib: {
      entry: ['src/index.ts', 'src/electron-protocol.ts'],
      formats: ['cjs', 'es'],
      fileName(format, entryName) {
        if (entryName === 'electron-protocol') {
          return 'electron-protocol.js'
        }
        return entryName.concat(format === 'cjs' ? '.js' : '.mjs')
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
})
