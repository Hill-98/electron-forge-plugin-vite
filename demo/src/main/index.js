import { join } from 'node:path'
import * as protocolHelper from '@hill-98/electron-forge-plugin-vite/protocol-helper'
import { BrowserWindow, app, protocol } from 'electron'

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
        preload: join(app.getAppPath(), import.meta.env.VITE_PRELOAD_SCRIPT),
      },
    })
    window.webContents.openDevTools()
    return window.loadURL(import.meta.env.VITE_RENDERER_URL)
  })
  .catch(console.error)

app.on('window-all-closed', app.quit.bind(app))

console.log(`This is the text from ${import.meta.env.VITE_BUILD_TARGET}`)
