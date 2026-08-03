import { type TestContext, test } from 'node:test'
import { makeCspHeader } from '../src/common.ts'

test('makeCspHeader test', (t: TestContext) => {
  t.assert.strictEqual(
    makeCspHeader({
      'default-src': ["'self'", 'app://main', 'app://renderer'],
      'image-src': ["'self'", 'app://image'],
    }),
    "default-src 'self' app://main app://renderer; image-src 'self' app://image",
  )
})
