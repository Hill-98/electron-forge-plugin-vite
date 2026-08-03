export function makeCspHeader(policy: Record<string, string[]>): string {
  return Object.entries(policy)
    .map(([key, item]) => `${key} ${item.join(' ')}`)
    .join('; ')
}
