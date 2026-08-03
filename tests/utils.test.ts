import { join, resolve } from 'node:path'
import { type TestContext, test } from 'node:test'
import {
  getElectronChromeVersion,
  getElectronNodeVersion,
  getElectronVersion,
  isEmptyInput,
  isObject,
  MERGE_ARRAY_SYMBOL,
  mergeDefaults,
  relativeFromPwd,
  resolveHtmlEntry,
  trimMergeArray,
} from '../src/utils.ts'

test('getElectronChromeVersion test', async (t: TestContext) => {
  t.assert.strictEqual(await getElectronChromeVersion(), '150')
})

test('getElectronNodeVersion test', async (t: TestContext) => {
  t.assert.strictEqual(await getElectronNodeVersion(), '24')
})

test('getElectronVersions test', async (t: TestContext) => {
  t.plan(3)
  t.assert.strictEqual(await getElectronVersion('electron'), '43.2.0')
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

test('isObject test', (t: TestContext) => {
  t.assert.ok(!isObject(''))
  t.assert.ok(!isObject(null))
  t.assert.ok(!isObject([]))
  t.assert.ok(isObject(Object.create(null)))
  t.assert.ok(isObject({}))
})

test('mergeDefaults test', (t: TestContext) => {
  t.assert.strictEqual(mergeDefaults(1), 1)
  t.assert.strictEqual(mergeDefaults(1, 2), 2)
  t.assert.strictEqual(mergeDefaults<any>({}, 2), 2)
  t.assert.deepStrictEqual(mergeDefaults<any>(1, { a: 2 }), { a: 2 })
  t.assert.deepStrictEqual(mergeDefaults<any>({ a: 1 }, { b: 2 }), {
    a: 1,
    b: 2,
  })
  t.assert.deepStrictEqual(
    mergeDefaults<any>({ a: 1, b: null }, { a: 2, b: { c: 3 } }),
    {
      a: 2,
      b: {
        c: 3,
      },
    },
  )
  t.assert.deepStrictEqual(
    mergeDefaults<any>(
      {
        a: 1,
        b: { c: {}, d: [], f: null },
        x: [MERGE_ARRAY_SYMBOL, 1],
        y: [2],
        z: [MERGE_ARRAY_SYMBOL, 4],
      },
      { a: 2, b: { d: null, f: {} }, x: [2], y: [3] },
    ),
    {
      a: 2,
      b: {
        c: {},
        d: null,
        f: {},
      },
      x: [1, 2],
      y: [3],
      z: [4],
    },
  )
})

test('relativeFromRoot test', (t: TestContext) => {
  t.assert.strictEqual(
    relativeFromPwd(resolve('.', '.vite/main')),
    '.vite/main',
  )
  t.assert.strictEqual(
    relativeFromPwd(resolve('src/renderer', '../../.vite/renderer')),
    '.vite/renderer',
  )
})

test('resolveHtmlEntry test', async (t: TestContext) => {
  const entry = await resolveHtmlEntry('./tests/renderer')
  t.assert.deepStrictEqual(entry, {
    index: join(process.cwd(), 'tests/renderer/index.html'),
    test: join(process.cwd(), 'tests/renderer/test/index.html'),
  })
  t.assert.deepStrictEqual(await resolveHtmlEntry('./x/renderer'), {})
})

test('trimMergeArray test', (t: TestContext) => {
  t.assert.deepStrictEqual(trimMergeArray(1), 1)
  t.assert.deepStrictEqual(trimMergeArray([MERGE_ARRAY_SYMBOL, 1]), [1])
  t.assert.deepStrictEqual(trimMergeArray({ a: [MERGE_ARRAY_SYMBOL, 1] }), {
    a: [1],
  })
})
