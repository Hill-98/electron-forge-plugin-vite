import { VitePlugin } from '../dist/electron-forge-plugin-vite.js'

/** @type {import('@electron-forge/shared-types').ForgeConfig} */
const config = {
  packagerConfig: {
    asar: true,
    ignore(path) {
      return path !== '' && path.match(/^\/(\.vite|package\.json)/) === null
    },
  },
  plugins: [new VitePlugin({})],
}

export default config
