import { join } from 'node:path'
import { type TestContext, test } from 'node:test'
import {
  absolutePath,
  getElectronChromeVersion,
  getElectronNodeVersion,
  getElectronVersion,
  resolveHtmlEntry,
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
})

test('getElectronChromeVersion test', (t: TestContext) =>
  new Promise((resolve, reject) => {
    getElectronChromeVersion()
      .then((version) => {
        t.assert.strictEqual(version, '146')
        resolve()
      })
      .catch(reject)
  }))

test('getElectronNodeVersion test', (t: TestContext) =>
  new Promise((resolve, reject) => {
    getElectronNodeVersion()
      .then((version) => {
        t.assert.strictEqual(version, '24')
        resolve()
      })
      .catch(reject)
  }))

test('getElectronVersions test', (t: TestContext) =>
  new Promise((resolve) => {
    getElectronVersion('1').catch((err) => {
      t.assert.strictEqual(err.message, 'Error: electron version 1 not found')
      resolve()
    })
  }))

test('resolveHtmlEntry test', (t: TestContext) =>
  new Promise((resolve) => {
    resolveHtmlEntry('./demo/src/renderer').then((entry) => {
      t.assert.deepStrictEqual(entry, {
        index: join(process.cwd(), 'demo/src/renderer/index.html'),
      })
      resolve()
    })
  }))
