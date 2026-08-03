import { VitePlugin } from '@hill-98/electron-forge-plugin-vite'

/** @type {import('@electron-forge/shared-types').ForgeConfig} */
const config = {
  packagerConfig: {
    asar: {
      unpack: '**/resources/*.js',
    },
  },
  plugins: [new VitePlugin({})],
}

export default config
