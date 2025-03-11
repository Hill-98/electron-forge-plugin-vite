export type CustomProtocolHandler = (
  req: Request,
) => Response | null | Promise<Response | null>

export declare const SCHEME: string

export declare function init(customHandler?: CustomProtocolHandler): void
