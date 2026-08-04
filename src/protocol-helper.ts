import { ok } from 'node:assert/strict'
import { existsSync as exists } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { parse } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { app, protocol } from 'electron'
import type {
  ProtocolHandler,
  ProtocolHandlerConfig,
  ProtocolRequest,
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

export async function protocolHandler(
  { paths }: ProtocolHandlerConfig,
  req: ProtocolRequest,
): Promise<Response> {
  const path = req.$path.slice(1)
  let response: Response | null = null
  if (typeof MAIN_PUBLIC_DIR === 'string' && req.$host === 'main') {
    const publicPath = pathGuard(paths.mainPublic, path)
    const publicUnpackPath = pathGuard(paths.mainPublicUnpack, path)
    response = exists(publicUnpackPath)
      ? await makeResponse(pathToFileURL(publicUnpackPath).toString())
      : await makeResponse(pathToFileURL(publicPath).toString())
  }
  if (req.$host === 'renderer') {
    response = await makeResponse(
      pathToFileURL(
        pathGuard(paths.renderer, path === '' ? 'index.html' : path),
      ).toString(),
    )
  }
  if (response === null) {
    response = await makeResponse('Not found', { status: 404 })
  }
  if (cspPolicyHeader) {
    response.headers.set('Content-Security-Policy', cspPolicyHeader)
  }
  return response
}

async function handleRequest(
  h: ProtocolHandler,
  config: ProtocolHandlerConfig,
  request: Request,
): Promise<Response> {
  const u = URL.parse(request.url)
  ok(u instanceof URL)
  const i = u.pathname.indexOf('/', 1)
  Object.defineProperties(request, {
    $host: {
      configurable: false,
      enumerable: true,
      writable: false,
      value: u.pathname.slice(1, i === -1 ? undefined : i),
    },
    $path: {
      configurable: false,
      enumerable: true,
      writable: false,
      value: (i === -1 ? '' : decodeURIComponent(u.pathname.slice(i))).replace(
        /^\/+/,
        '/',
      ),
    },
    $params: {
      configurable: false,
      enumerable: true,
      writable: false,
      value: u.searchParams,
    },
    $search: {
      configurable: false,
      enumerable: true,
      writable: false,
      value: u.search,
    },
  })
  let response = await h(config, request as ProtocolRequest)
  if (response === null) {
    response = await protocolHandler(config, request as ProtocolRequest)
  }
  return response
}

export function init(...args: [ProtocolHandler]) {
  const config: ProtocolHandlerConfig = {
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

  const h: ProtocolHandler = args[0] ?? protocolHandler
  if (app.isReady()) {
    protocol.handle(SCHEME, handleRequest.bind(null, h, config))
  } else {
    app.whenReady().then(init.bind(null, ...args))
  }
}
