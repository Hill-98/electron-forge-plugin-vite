import { join } from 'node:path'
import { BrowserWindow, app } from 'electron'

app.whenReady().then(() => {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(app.getAppPath(), '.vite/preload/index.cjs'),
    },
  })
  if (import.meta.env.VITE_RENDERER_URL) {
    window.loadURL(import.meta.env.VITE_RENDERER_URL.concat('/index.html'))
  } else {
    window.loadFile(join(app.getAppPath(), '.vite/renderer/index.html'))
  }
})

app.on('window-all-closed', app.quit.bind(app))

console.log(`This is the text from ${import.meta.env.VITE_BUILD_TARGET}`)
