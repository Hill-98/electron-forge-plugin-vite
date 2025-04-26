import { rmSync as rm } from 'node:fs'
import { builtinModules } from 'node:module'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import pkg from './package.json'

const dependencies = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.devDependencies),
  ...Object.keys(pkg.peerDependencies),
]
const nodeBuiltinModules = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]

process.on('exit', async () => {
  rm(join(import.meta.dirname, 'dist/electron-protocol-helper.js'))
  rm(join(import.meta.dirname, 'dist/index.mjs'))
})

export default defineConfig({
  build: {
    outDir: 'dist',
    target: ['node16'],
    minify: false,
    lib: {
      entry: ['src/electron-protocol-helper.ts', 'src/index.ts'],
      formats: ['cjs', 'es'],
      fileName(format, entryName) {
        return entryName.concat(format === 'es' ? '.mjs' : '.js')
      },
    },
    reportCompressedSize: false,
    rollupOptions: {
      external(id) {
        return (
          nodeBuiltinModules.includes(id) ||
          dependencies.some(
            (dep) => id === dep || id.startsWith(dep.concat('/')),
          )
        )
      },
    },
  },
  define: {
    'import.meta.env.VITE_MAIN_PUBLIC_DIR':
      'import.meta.env.VITE_MAIN_PUBLIC_DIR',
    'import.meta.env.VITE_RENDERER_OUT_DIR':
      'import.meta.env.VITE_RENDERER_OUT_DIR',
  },
})
