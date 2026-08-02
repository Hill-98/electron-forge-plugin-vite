import { defineConfig } from 'tsdown'

export default defineConfig({
  define: {
    'import.meta.env.VITE_MAIN_PUBLIC_DIR':
      'import.meta.env.VITE_MAIN_PUBLIC_DIR',
    'import.meta.env.VITE_RENDERER_OUT_DIR':
      'import.meta.env.VITE_RENDERER_OUT_DIR',
  },
  deps: {
    neverBundle: true,
  },
  dts: false,
  entry: ['./src/protocol-helper.ts', './src/index.ts'],
  inputOptions: {
    experimental: {
      attachDebugInfo: 'none',
    },
  },
  outputOptions: {
    comments: false,
  },
})
