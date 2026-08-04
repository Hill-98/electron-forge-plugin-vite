import { join } from 'node:path'
import * as protocolHelper from '@hill-98/electron-forge-plugin-vite/protocol-helper'
import { makeResponse } from '@hill-98/electron-forge-plugin-vite/protocol-helper'
import { Xxh64 } from '@node-rs/xxhash'
import { app, BrowserWindow, protocol } from 'electron'

protocol.registerSchemesAsPrivileged([
  {
    scheme: protocolHelper.SCHEME,
    privileges: {
      allowServiceWorkers: true,
      corsEnabled: import.meta.env.DEV,
      standard: true,
      secure: true,
      stream: true,
      supportFetchAPI: true,
    },
  },
])

protocolHelper.init((_, req) =>
  req.$path === '/hello' ? makeResponse('Hello World!') : null,
)

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
    return window.loadURL(import.meta.env.VITE_RENDERER_URL_PREFIX)
  })
  .catch(console.error)

app.on('window-all-closed', app.quit.bind(app))
