import { type TestContext, test } from 'node:test'
import { absolutePath, resolvePathname } from '../src/protocol-helper-utils.ts'

test('absolutePath test', (t: TestContext) => {
  t.assert.strictEqual(absolutePath('test'), 'test')
  t.assert.strictEqual(absolutePath('./test'), 'test')
  t.assert.strictEqual(absolutePath('/test'), '/test')
  t.assert.strictEqual(absolutePath('/test/test/.test'), '/test/test/.test')
  t.assert.strictEqual(absolutePath('/test/test/..test'), '/test/test/..test')
  t.assert.strictEqual(absolutePath('/test//te/st///test'), '/test/te/st/test')
  t.assert.strictEqual(absolutePath('/test/../te/st/..//test'), '/te/test')
  t.assert.strictEqual(absolutePath('test/../te/st/..//te/./st'), 'te/te/st')
  t.assert.strictEqual(absolutePath('../te/st/..//te/./st'), 'te/te/st')
  t.assert.strictEqual(absolutePath('../te\\st/..\\/te/.\\st'), 'te/te/st')
})

test('resolvePathname test', (t: TestContext) => {
  t.assert.strictEqual(resolvePathname(new URL('app://main/test')), 'test')
  t.assert.strictEqual(
    resolvePathname(new URL('app://renderer/%E6%B5%8B%E8%AF%95')),
    '测试',
  )
  t.assert.strictEqual(
    resolvePathname(new URL('app://renderer/%2Ftest')),
    'test',
  )
  t.assert.strictEqual(
    resolvePathname(new URL('app://renderer/%2Ftest%2Ftest')),
    'test/test',
  )
  t.assert.strictEqual(
    resolvePathname(new URL('app://renderer/%2F%E6%B5%8B%E8%AF%95')),
    '测试',
  )
  t.assert.strictEqual(
    resolvePathname(new URL('app://renderer/%2E%2Etest')),
    '..test',
  )
  t.assert.strictEqual(
    resolvePathname(new URL('app://renderer/%2E%2E%2Ftest')),
    'test',
  )
  t.assert.strictEqual(
    resolvePathname(new URL('app://renderer/%2E%2Ftest%2F..')),
    '',
  )
  t.assert.strictEqual(
    resolvePathname(
      new URL('app://renderer/%2E%2Ftest%2F%2E%2E%2F/etc/%2E%2E/passwd'),
    ),
    'passwd',
  )
  t.assert.strictEqual(
    resolvePathname(
      new URL(
        'app://renderer/%2E%2Ftest%2F..%2F%E6%B5%8B%E8%AF%95%/../%65%74%63/passwd',
      ),
    ),
    'etc/passwd',
  )
})
