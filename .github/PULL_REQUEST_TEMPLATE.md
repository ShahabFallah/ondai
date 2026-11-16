## What and why

<!-- One or two sentences. Link the issue if there is one. -->

## How it was checked

- [ ] `pnpm registry:build` (no diff left in the generated registry)
- [ ] `pnpm turbo typecheck lint test` and `pnpm --filter @ondai/registry test`
- [ ] For a component: every state and skin in the playground, light and dark, reduced motion
- [ ] Devices tested (iPhone / Android, OS version)
- [ ] `pnpm changeset` if `@ondai/core`, `@ondai/tokens` or the CLI changed
