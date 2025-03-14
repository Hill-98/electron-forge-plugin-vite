import { VitePlugin } from '@hill-98/electron-forge-plugin-vite'

/** @type {import('@electron-forge/shared-types').ForgeConfig} */
const config = {
  packagerConfig: {
    asar: true,
    ignore(path) {
      return (
        path !== '' &&
        path.match(/^\/(\.vite|resources|package\.json)/) === null
      )
    },
  },
  plugins: [new VitePlugin({})],
}

export default config
