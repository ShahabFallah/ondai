import { Command } from 'commander'
import { add } from './commands/add'
import { diff } from './commands/diff'
import { doctor } from './commands/doctor'
import { init } from './commands/init'
import { list } from './commands/list'
import { fail } from './ui'

const program = new Command()
program.name('ondai').description('Beautiful on-device AI components for React Native. Copy. Paste. Private AI.').version('0.1.0')
program.option('-C, --cwd <dir>', 'project directory', process.cwd()).option('-r, --registry <url>', 'registry URL (or ONDAI_REGISTRY)')

program
  .command('init')
  .description('Configure the project: ondai.json, provider file, polyfills, dependencies')
  .option('-y, --yes', 'accept defaults')
  .option('--no-install', 'skip dependency installation')
  .option('--components-dir <dir>', 'where components are copied')
  .action(async (o) => {
    const g = program.opts()
    await init({ cwd: g.cwd, registry: g.registry, yes: o.yes, install: o.install, componentsDir: o.componentsDir })
  })

program
  .command('add <names...>')
  .description('Copy components (and their registry dependencies) into the project')
  .option('--overwrite', 'overwrite existing files')
  .option('-y, --yes', 'never prompt')
  .option('--dry-run', 'show what would be written')
  .option('--no-install', 'skip dependency installation')
  .action(async (names: string[], o) => {
    const g = program.opts()
    await add({ cwd: g.cwd, names, registry: g.registry, overwrite: o.overwrite, yes: o.yes, dryRun: o.dryRun, install: o.install })
  })

program
  .command('list')
  .description('List components in the registry')
  .option('--json', 'machine-readable output')
  .action(async (o) => {
    const g = program.opts()
    await list({ cwd: g.cwd, registry: g.registry, json: o.json })
  })

program
  .command('diff <name>')
  .description('Show differences between installed files and the registry')
  .action(async (name: string) => {
    const g = program.opts()
    await diff({ cwd: g.cwd, name, registry: g.registry })
  })

program
  .command('doctor')
  .description('Check versions, New Architecture, providers and polyfills')
  .action(() => {
    const g = program.opts()
    const checks = doctor(g.cwd)
    if (checks.some((c) => c.status === 'fail')) process.exitCode = 1
  })

program.parseAsync().catch((e: unknown) => {
  console.error(fail(e instanceof Error ? e.message : String(e)))
  process.exitCode = 1
})
