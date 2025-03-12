import { join } from 'node:path'
import { BrowserWindow, app, protocol } from 'electron'
import * as protocolHelper from './dist/electron-protocol-helper.mjs'

protocol.registerSchemesAsPrivileged([
  {
    scheme: protocolHelper.SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
])

protocolHelper.init()

app
  .whenReady()
  .then(() => {
    const window = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: join(app.getAppPath(), '.vite/preload/index.cjs'),
      },
    })
    window.webContents.openDevTools()
    return window.loadURL(import.meta.env.VITE_RENDERER_URL)
  })
  .catch(console.error)

app.on('window-all-closed', app.quit.bind(app))

console.log(`This is the text from ${import.meta.env.VITE_BUILD_TARGET}`)
