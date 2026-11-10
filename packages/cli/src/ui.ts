import pc from 'picocolors'

export const glyph = pc.magenta('◉')
export const brand = `${glyph} ${pc.bold('ondai')}`
export const dim = (s: string) => pc.dim(s)
export const mono = (s: string) => pc.cyan(s)
export const ok = (s: string) => `${pc.green('✓')} ${s}`
export const warn = (s: string) => `${pc.yellow('!')} ${s}`
export const fail = (s: string) => `${pc.red('✗')} ${s}`
export const title = (s: string) => `\n${brand} ${pc.dim('·')} ${s}\n`
