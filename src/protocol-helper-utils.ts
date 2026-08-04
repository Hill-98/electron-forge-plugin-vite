import { ok } from 'node:assert/strict'
import { resolve } from 'node:path'

export function pathGuard(root: string, path: string) {
  const result = resolve(root, path)
  ok(
    result.startsWith(`${root}/`),
    'The resolved path is not in the root path.',
  )
  return result
}
