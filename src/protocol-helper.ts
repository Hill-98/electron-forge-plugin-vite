import { ok } from 'node:assert/strict'
import { existsSync as exists } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { parse } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { app, protocol } from 'electron'
import type {
  ProtocolHandler,
  ProtocolHandlerConfig,
} from '../types/protocol-helper.d.ts'
import { makeCspHeader } from './common.ts'
import { pathGuard } from './protocol-helper-utils.ts'

export const CSP_POLICY = import.meta.env.VITE_CSP_POLICY ?? null
export const DEFAULT_MIME_TYPE = 'application/octet-stream'
export const SCHEME = 'app'

const MAIN_PUBLIC_DIR = import.meta.env.VITE_MAIN_PUBLIC_DIR ?? 'public'
const RENDERER_OUT_DIR = import.meta.env.VITE_RENDERER_OUT_DIR ?? 'renderer'

const cspPolicyHeader = CSP_POLICY ? makeCspHeader(CSP_POLICY) : null
const mimes = new Map()

function initMimeTypes() {
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

  for (const type in MIME_TYPES) {
    if (type.includes('/')) {
      const extensions = (MIME_TYPES[type] as string).split(' ')
      for (const ext of extensions) {
        if (ext.trim() !== '') {
          mimes.set(`.${ext}`, type)
        }
      }
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
      const data = await readFile(path)
      const mimeType = mimes.get(parse(path).ext)
      return new Response(data, {
        ...init,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': mimeType ?? DEFAULT_MIME_TYPE,
          'Content-Length': data.length.toString(),
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

async function protocolHandler(
  { paths }: ProtocolHandlerConfig,
  req: Request,
): Promise<Response> {
  const url = URL.parse(req.url)
  ok(url instanceof URL)
  const pathname = decodeURIComponent(url.pathname).slice(1)
  let response: Response | null = null
  if (typeof MAIN_PUBLIC_DIR === 'string' && url.host === 'main') {
    const path = pathGuard(paths.mainPublic, pathname)
    const unpackPath = pathGuard(paths.mainPublicUnpack, pathname)
    response = exists(unpackPath)
      ? await makeResponse(pathToFileURL(unpackPath).toString())
      : await makeResponse(pathToFileURL(path).toString())
  }
  if (url.host === 'renderer') {
    response = await makeResponse(
      pathToFileURL(
        pathGuard(paths.renderer, pathname === '' ? 'index.html' : pathname),
      ).toString(),
    )
  }
  if (response === null) {
    response = await makeResponse('Not found', { status: 404 })
  }
  response.headers.set('Access-Control-Allow-Origin', '*')
  if (cspPolicyHeader) {
    response.headers.set('Content-Security-Policy', cspPolicyHeader)
  }
  return response
}

export function init(handler?: ProtocolHandler) {
  const handlerConfig: ProtocolHandlerConfig = {
    paths: {
      mainPublic: pathGuard(app.getAppPath(), MAIN_PUBLIC_DIR),
      mainPublicUnpack: pathGuard(
        app.getAppPath().replace(/app\.asar$/, 'app.asar.unpacked'),
        MAIN_PUBLIC_DIR,
      ),
      renderer: pathGuard(app.getAppPath(), RENDERER_OUT_DIR),
    },
  }

  if (mimes.size === 0) {
    initMimeTypes()
  }

  const h: ProtocolHandler = handler ?? protocolHandler
  if (app.isReady()) {
    protocol.handle(SCHEME, (request: Request) =>
      Promise.resolve(h(handlerConfig, request)).then((v) =>
        v === null ? protocolHandler(handlerConfig, request) : v,
      ),
    )
  } else {
    app.whenReady().then(init.bind(null, handler))
  }
}
