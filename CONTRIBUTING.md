# Contributing to Ondai

Ondai is a set of packages for building AI features on the phone's own model: the runtime (`@ondai/core`), the design tokens (`@ondai/tokens`) and the CLI (`ondai`).

## Set up

You need Node 22.13+ (`.nvmrc`) and pnpm 10 (`corepack enable` picks the right version).

```bash
pnpm install
pnpm turbo typecheck lint test
```

## Before you open a pull request

```bash
pnpm turbo typecheck lint test   # every package
pnpm changeset                   # if a published package changed: @ondai/core, @ondai/tokens or ondai
```

CI runs the same checks and lints the packed tarballs with publint and Are the Types Wrong.

## Ground rules

- **Small models first.** Budget prompts for a 4,096-token context, validate model output with zod, and design a calm state for refusals and unavailability.
- **Privacy.** Nothing leaves the device unless the app has opted into a cloud provider. No telemetry.
- **Types.** Public APIs are fully typed and ship as ESM with declaration files.

## Commit messages

Short, present tense, prefixed with the area: `core: fall back to the next provider`, `cli: resolve registry dependencies depth-first`.

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By taking part you agree to it.
