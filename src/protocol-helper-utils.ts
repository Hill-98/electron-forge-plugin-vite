export function normalizePath(path: string) {
  return (path.startsWith('/') ? '/' : '').concat(
    path
      .replaceAll('\\', '/')
      .split('/')
      .filter((p) => p.trim() !== '' && p !== '.')
      .reduce((result, p) => {
        if (p === '..') {
          result.pop()
        } else {
          result.push(p)
        }
        return result
      }, [] as string[])
      .join('/'),
  )
}

export function resolvePathname(u: URL) {
  return normalizePath(decodeURIComponent(u.pathname)).substring(1)
}
