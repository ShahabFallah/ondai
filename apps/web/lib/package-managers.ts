/**
 * Install commands for every package manager. The docs write each command once, the npm way, in an
 * ```` ```npm ```` block; Fumadocs' remark-npm turns it into npm / pnpm / yarn / bun tabs with these
 * converters (the choice persists across the site).
 *
 *   npx expo install a b   ->  pnpm expo install / yarn expo install / bunx expo install  (Expo's own forms)
 *   npx ondai add x        ->  pnpm dlx / yarn dlx / bunx
 *   npm install a          ->  pnpm add / yarn add / bun add  (-D kept)
 */

type Manager = 'npm' | 'pnpm' | 'yarn' | 'bun'

export function convertCommand(line: string, to: Manager): string {
  if (to === 'npm') return line
  const t = line.trim()
  const indent = line.slice(0, line.length - line.trimStart().length)
  const rest = (prefix: string) => t.slice(prefix.length)
  // Expo's CLI lives in the project: run it through the manager, never download it again.
  if (t.startsWith('npx expo ')) return indent + { pnpm: 'pnpm expo ', yarn: 'yarn expo ', bun: 'bunx expo ' }[to] + rest('npx expo ')
  if (t.startsWith('npx ')) return indent + { pnpm: 'pnpm dlx ', yarn: 'yarn dlx ', bun: 'bunx ' }[to] + rest('npx ')
  const install = t.match(/^npm (?:install|i|add)(\s+.*)?$/)
  if (install) {
    const args = (install[1] ?? '').replace(/\s--save-dev\b/, ' -D')
    if (!args.trim()) return indent + { pnpm: 'pnpm install', yarn: 'yarn', bun: 'bun install' }[to]
    return indent + { pnpm: 'pnpm add', yarn: 'yarn add', bun: 'bun add' }[to] + args
  }
  const run = t.match(/^npm run (.+)$/)
  if (run) return indent + { pnpm: 'pnpm ', yarn: 'yarn ', bun: 'bun run ' }[to] + run[1]
  return line
}

const convertLines = (code: string, to: Manager) =>
  code
    .split('\n')
    // Each command of a `a && b` chain converts on its own.
    .map((l) => (l.trimStart().startsWith('#') ? l : l.split(' && ').map((part) => convertCommand(part, to)).join(' && ')))
    .join('\n')

export const packageManagers = (['npm', 'pnpm', 'yarn', 'bun'] as const).map((name) => ({ name, command: (code: string) => convertLines(code, name) }))
