import { sep } from 'node:path'
import { type TestContext, test } from 'node:test'
import { pathGuard } from '../src/protocol-helper-utils.ts'

test('pathGuard test', (t: TestContext) => {
  if (sep !== '/') {
    t.skip(
      'The current system uses backslash as path separator, which is not supported.',
    )
    return
  }
  t.assert.strictEqual(pathGuard('/app', 'test'), '/app/test')
  t.assert.throws(pathGuard.bind(null, '/app', '/appa'), {
    name: 'AssertionError',
    message: 'The resolved path is not in the root path.',
  })
  t.assert.throws(pathGuard.bind(null, '/app', '/test/test'), {
    name: 'AssertionError',
    message: 'The resolved path is not in the root path.',
  })
  t.assert.throws(pathGuard.bind(null, '/app', './test/..'), {
    name: 'AssertionError',
    message: 'The resolved path is not in the root path.',
  })
  t.assert.strictEqual(
    pathGuard('/app', './test/..//etc/./passwd'),
    '/app/etc/passwd',
  )
})
