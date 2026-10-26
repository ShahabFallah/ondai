import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

export const DEFAULT_REGISTRY = 'https://ondai.dev/r'

export const configSchema = z.object({
  $schema: z.string().optional(),
  registry: z.string().default(DEFAULT_REGISTRY),
  /** Where components are copied, relative to the project root. */
  componentsDir: z.string().default('components/ondai'),
  /** Import alias that points at `componentsDir`'s parent, if the project has one (e.g. "@/components"). */
  alias: z.string().optional(),
})
export type OndaiConfig = z.infer<typeof configSchema>

export function configPath(cwd: string) {
  return join(cwd, 'ondai.json')
}

export function readConfig(cwd: string): OndaiConfig | null {
  const p = configPath(cwd)
  if (!existsSync(p)) return null
  return configSchema.parse(JSON.parse(readFileSync(p, 'utf8')))
}

export function writeConfig(cwd: string, config: OndaiConfig) {
  writeFileSync(configPath(cwd), JSON.stringify({ $schema: 'https://ondai.dev/schema/config.json', ...config }, null, 2) + '\n')
}
