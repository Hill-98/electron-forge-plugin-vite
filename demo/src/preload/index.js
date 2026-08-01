import { SCHEME } from '@hill-98/electron-forge-plugin-vite/protocol-helper'
import { contextBridge } from 'electron/renderer'
import 'electron-ipc-flow/preload'

contextBridge.exposeInMainWorld('SCHEME', SCHEME)
document.addEventListener('DOMContentLoaded', () => {
  document.body.append(
    Object.assign(document.createElement('p'), {
      textContent: `This is the text from ${import.meta.env.VITE_BUILD_TARGET}`,
    }),
  )
})
