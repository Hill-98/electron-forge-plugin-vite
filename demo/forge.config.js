import { VitePlugin } from '@hill-98/electron-forge-plugin-vite'

/** @type {import('@electron-forge/shared-types').ForgeConfig} */
const config = {
  packagerConfig: {
    asar: {
      unpack: '**/resources/*.js',
    },
    ignore(path) {
      return (
        path !== '' &&
        !/^\/(\.vite|(node_modules($|\/@node-rs))|resources|package\.json)/.test(
          path,
        )
      )
    },
  },
  plugins: [new VitePlugin({})],
}

export default config
