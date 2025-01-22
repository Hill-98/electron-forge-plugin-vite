import { contextBridge } from 'electron/renderer'

contextBridge.exposeInMainWorld('TEST_TEXT', 'Hello World!')
