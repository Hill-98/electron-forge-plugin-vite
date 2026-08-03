import { spawn } from 'node:child_process'
import { existsSync as exists } from 'node:fs'
import { readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, relative, resolve } from 'node:path'
import electron from 'electron'

const electronVersions = new Map<string, string>()

export const MERGE_ARRAY_SYMBOL: any = Symbol()

export async function getElectronVersion(name: string): Promise<string> {
  const version = electronVersions.get(name)
  if (version) {
    return version
  }

  const script = resolve(
    tmpdir(),
    'electron-forge-plugin-vite.getElectronVersion.js',
  )
  await writeFile(
    script,
    'process.stdout.write(JSON.stringify(process.versions)); process.exit(0);',
  )
  const p = spawn(electron as unknown as string, [script], { stdio: 'pipe' })
  let stdout = ''
  p.stdout.setEncoding('utf8')
  p.stdout.on('data', (chunk: string) => {
    stdout += chunk
  })
  return new Promise((resolve, reject) => {
    p.on('error', reject)
    p.once('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Error: electron exit code is ${code}`))
        return
      }
      const result = JSON.parse(stdout)
      for (const key in result) {
        electronVersions.set(key, result[key])
      }
      const version = electronVersions.get(name)
      if (version) {
        resolve(version)
      } else {
        reject(new Error(`Error: electron version ${name} not found`))
      }
    })
  })
}

export async function getElectronChromeVersion(): Promise<string> {
  return (await getElectronVersion('chrome')).split('.')[0] as string
}

export async function getElectronNodeVersion(): Promise<string> {
  return (await getElectronVersion('node')).split('.')[0] as string
}

export function isEmptyInput(value: any): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0)
  )
}

export function isObject(obj: any): obj is object {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj)
}

export function mergeDefaults<T>(defaults: T, target?: T): T {
  if (target === undefined) {
    return trimMergeArray(defaults)
  }
  if (!isObject(defaults) || !isObject(target)) {
    return target
  }
  for (const key of Reflect.ownKeys(defaults)) {
    const dValue = Reflect.get(defaults, key)
    const tValue = Reflect.get(target, key)
    if (!Reflect.has(target, key)) {
      Reflect.set(target, key, trimMergeArray(dValue))
    } else if (isObject(tValue)) {
      mergeDefaults<any>(dValue, tValue)
    } else if (
      Array.isArray(dValue) &&
      Array.isArray(tValue) &&
      dValue.includes(MERGE_ARRAY_SYMBOL)
    ) {
      Reflect.set(target, key, trimMergeArray([...dValue, ...tValue]))
    }
  }
  return target
}

export function relativeFromPwd(to: string): string {
  return relative(resolve('.'), to)
}

export async function resolveHtmlEntry(
  dir: string,
): Promise<Record<string, string>> {
  const result = {}
  if (!exists(dir)) {
    return result
  }
  const files = await readdir(dir, { encoding: 'utf-8', recursive: true })
  for (const file of files) {
    if (file === 'index.html') {
      Reflect.set(result, 'index', resolve(dir, file))
    } else if (basename(file) === 'index.html') {
      Reflect.set(
        result,
        dirname(file).replace(/[\\/]/g, '_'),
        resolve(dir, file),
      )
    }
  }
  return result
}

export function trimMergeArray<T>(obj: T): T {
  if (Array.isArray(obj) && obj.includes(MERGE_ARRAY_SYMBOL)) {
    return obj.filter((v) => v !== MERGE_ARRAY_SYMBOL) as T
  }
  if (isObject(obj)) {
    for (const key of Reflect.ownKeys(obj)) {
      const value = Reflect.get(obj, key)
      if (typeof value === 'object' && value !== null) {
        Reflect.set(obj, key, trimMergeArray(value))
      }
    }
  }
  return obj
}
