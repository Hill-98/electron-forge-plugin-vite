import { spawn } from 'node:child_process'
import { existsSync as exists } from 'node:fs'
import { readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, resolve } from 'node:path'
import electron from 'electron'

const electronVersions = new Map<string, string>()

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
  return (await getElectronVersion('chrome')).split('.')[0]
}

export async function getElectronNodeVersion(): Promise<string> {
  return (await getElectronVersion('node')).split('.')[0]
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
        dirname(file).replace(/[\\\/]/g, '_'),
        resolve(dir, file),
      )
    }
  }
  return result
}
