import { VitePlugin, defineConfig } from '@hill-98/electron-forge-plugin-vite'

/** @type {import('@electron-forge/shared-types').ForgeConfig} */
const config = {
  packagerConfig: {
    asar: {
      unpack: '**/resources/*.js',
    },
    ignore(path) {
      return (
        path !== '' &&
        path.match(/^\/(\.vite|resources|package\.json)/) === null
      )
    },
  },
  plugins: [
    new VitePlugin({
      configs: defineConfig({
        main: {
          define: {
            'import.meta.env.VITE_PRELOAD_SCRIPT': JSON.stringify(
              '.vite/preload/index.cjs',
            ),
          },
        },
      }),
    }),
  ],
}

export default config
