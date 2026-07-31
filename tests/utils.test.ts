import { join } from 'node:path'
import { type TestContext, test } from 'node:test'
import {
  absolutePath,
  getElectronChromeVersion,
  getElectronNodeVersion,
  getElectronVersion,
  isEmptyInput,
  resolveHtmlEntry,
  resolvePathname,
} from '../src/utils.ts'

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

test('getElectronChromeVersion test', async (t: TestContext) => {
  t.assert.strictEqual(await getElectronChromeVersion(), '150')
})

test('getElectronNodeVersion test', async (t: TestContext) => {
  t.assert.strictEqual(await getElectronNodeVersion(), '24')
})

test('getElectronVersions test', async (t: TestContext) => {
  try {
    await getElectronVersion('1')
  } catch (err: unknown) {
    t.assert.ok(err instanceof Error)
    t.assert.strictEqual(err.message, 'Error: electron version 1 not found')
  }
})

test('isEmptyInput test', (t: TestContext) => {
  t.assert.strictEqual(isEmptyInput(null), true)
  t.assert.strictEqual(isEmptyInput(undefined), true)
  t.assert.strictEqual(isEmptyInput(''), true)
  t.assert.strictEqual(isEmptyInput('   '), true)
  t.assert.strictEqual(isEmptyInput('x'), false)
  t.assert.strictEqual(isEmptyInput([]), true)
  t.assert.strictEqual(isEmptyInput(['1']), false)
  t.assert.strictEqual(isEmptyInput({}), true)
  t.assert.strictEqual(isEmptyInput({ a: '1' }), false)
})

test('resolveHtmlEntry test', async (t: TestContext) => {
  const entry = await resolveHtmlEntry('./tests/renderer')
  t.assert.deepStrictEqual(entry, {
    index: join(process.cwd(), 'tests/renderer/index.html'),
    test: join(process.cwd(), 'tests/renderer/test/index.html'),
  })
  t.assert.deepStrictEqual(await resolveHtmlEntry('./x/renderer'), {})
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
