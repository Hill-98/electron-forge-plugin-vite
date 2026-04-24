import { existsSync as exists } from 'node:fs'
import { stat } from 'node:fs/promises'
import { parse, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import electron from 'electron'
import type { CustomProtocolHandler } from '../types/electron-protocol-helper.d.ts'
import { resolvePathname } from './utils.ts'

export const DEFAULT_MIME_TYPE = 'application/octet-stream'
export const SCHEME = 'app'

const MIME_TYPES: Record<string, string> = {
  'application/json': 'json',
  'application/wasm': 'wasm',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'oga ogg opus spx',
  'audio/x-flac': 'flac',
  'font/otf': 'otf',
  'font/ttf': 'ttf',
  'font/woff': 'woff',
  'font/woff2': 'woff2',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/heic': 'heic',
  'image/gif': 'gif',
  'image/jpeg': 'jpg jpeg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'text/css': 'css',
  'text/html': 'html htm',
  'text/javascript': 'js mjs',
  'text/plain': 'md txt',
  'text/xml': 'xml',
  'video/mp4': 'mp4',
  'video/ogg': 'ogv',
  'video/webm': 'webm',
}

const MAIN_PUBLIC_DIR = import.meta.env.VITE_MAIN_PUBLIC_DIR ?? 'public'
const RENDERER_OUT_DIR = import.meta.env.VITE_RENDERER_OUT_DIR ?? 'renderer'

const mimes = new Map()
const paths = {
  mainPublic: resolve(electron.app.getAppPath(), MAIN_PUBLIC_DIR),
  mainPublicUnpack: resolve(
    electron.app.getAppPath().replace(/app\.asar$/, 'app.asar.unpacked'),
    MAIN_PUBLIC_DIR,
  ),
  renderer: resolve(electron.app.getAppPath(), RENDERER_OUT_DIR),
}

export function addMimeType(type: string, extensions: string[]) {
  for (const ext of extensions) {
    if (ext.trim() !== '') {
      mimes.set(ext.startsWith('.') ? ext : `.${ext}`, type)
    }
  }
}

export async function makeResponse(
  body: BodyInit | null,
  init?: ResponseInit,
): Promise<Response> {
  if (typeof body === 'string' && body.startsWith('file://')) {
    const path = fileURLToPath(body)
    if (!exists(path)) {
      return makeResponse('Not found', { status: 404 })
    }
    try {
      const state = await stat(path)
      if (!state.isFile()) {
        return makeResponse('Forbidden', { status: 403 })
      }
      const res = await electron.net.fetch(body)
      const mimeType = mimes.get(parse(path).ext)
      return new Response(res.body, {
        ...init,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': mimeType === false ? DEFAULT_MIME_TYPE : mimeType,
          'Content-Length': state.size.toString(),
          Date: new Date().toUTCString(),
          ...init?.headers,
        },
      })
    } catch (err: any) {
      return makeResponse(`Error: ${err.message}`, { status: 500 })
    }
  }

  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'Content-Type': typeof body === 'string' ? 'text/plain' : DEFAULT_MIME_TYPE,
    Date: new Date().toUTCString(),
  }

  if (body === null) {
    headers['Content-Length'] = '0'
  } else if (typeof body === 'string') {
    headers['Content-Length'] = body.length.toString()
  } else if ('byteLength' in body) {
    headers['Content-Length'] = body.byteLength.toString()
  } else if ('length' in body && typeof body.length === 'number') {
    headers['Content-Length'] = body.length.toString()
  } else if ('size' in body) {
    headers['Content-Length'] = body.size.toString()
  }

  return new Response(body, {
    ...init,
    headers: {
      ...headers,
      ...init?.headers,
    },
  })
}

function protocolHandler(req: Request): Promise<Response> {
  const url = URL.parse(req.url) as URL
  const pathname = resolvePathname(url)
  if (url.host === 'main' && typeof MAIN_PUBLIC_DIR === 'string') {
    const path = resolve(paths.mainPublic, pathname)
    const unpackPath = resolve(paths.mainPublicUnpack, pathname)
    return exists(unpackPath)
      ? makeResponse(pathToFileURL(unpackPath).toString())
      : makeResponse(pathToFileURL(path).toString())
  }
  if (url.host === 'renderer') {
    return makeResponse(
      pathToFileURL(
        resolve(paths.renderer, pathname === '' ? 'index.html' : pathname),
      ).toString(),
    )
  }
  return makeResponse('Not found', { status: 404 })
}

export function init(customHandler: CustomProtocolHandler = protocolHandler) {
  if (electron.app.isReady()) {
    electron.protocol.handle(SCHEME, (request: Request) =>
      Promise.resolve(customHandler(request)).then((v) =>
        v === null ? protocolHandler(request) : v,
      ),
    )
  } else {
    electron.app.whenReady().then(init.bind(null, customHandler))
  }
}

for (const type in MIME_TYPES) {
  if (!type.includes('/')) {
    continue
  }
  const extensions = MIME_TYPES[type].split(' ')
  addMimeType(type, extensions)
}
