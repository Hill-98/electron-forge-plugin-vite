import { builtinModules } from 'node:module'
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

export default defineConfig({
  build: {
    outDir: 'dist',
    target: ['node22'],
    minify: false,
    lib: {
      entry: ['src/electron-protocol-helper.ts', 'src/index.ts'],
      formats: ['es'],
    },
    reportCompressedSize: false,
    rolldownOptions: {
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
