import { join } from 'node:path'
import { BrowserWindow, app, protocol } from 'electron'
import { SCHEME, init } from './dist/electron-protocol.js'

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
])

init()

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
