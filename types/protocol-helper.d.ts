export interface ProtocolHandlerConfig {
  paths: ProtocolHandlerPaths
}

export type ProtocolHandler = (
  config: ProtocolHandlerConfig,
  req: Request,
) => Response | null | Promise<Response | null>

export interface ProtocolHandlerPaths {
  mainPublic: string
  mainPublicUnpack: string
  renderer: string
}

export declare const CSP_POLICY: Record<string, string[]> | null

export declare const SCHEME: string

export declare function makeResponse(
  body: BodyInit | null,
  init?: ResponseInit,
): Promise<Response>

export declare function init(handler?: ProtocolHandler): void
