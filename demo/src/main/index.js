import { join } from 'node:path'
import * as protocolHelper from '@hill-98/electron-forge-plugin-vite/protocol-helper'
import { Xxh64 } from '@node-rs/xxhash'
import { app, BrowserWindow, protocol } from 'electron'

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
        preload: join(import.meta.dirname, '/../preload/index.js'),
      },
    })
    window.webContents.on('did-finish-load', () =>
      window.webContents.executeJavaScript(
        `
document.body.append(
  Object.assign(document.createElement('p'), {
    textContent: 'This is the text from ${import.meta.env.VITE_BUILD_TARGET}: ${new Xxh64().update('Hello World!').digest()}',
  }))`,
      ),
    )
    window.webContents.openDevTools()
    return window.loadURL(import.meta.env.VITE_RENDERER_URL)
  })
  .catch(console.error)

app.on('window-all-closed', app.quit.bind(app))
