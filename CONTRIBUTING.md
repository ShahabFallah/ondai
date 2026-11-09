# Contributing to Ondai

Thanks for helping. Ondai is a registry of React Native components that run on the phone's own model, plus the small runtime (`@ondai/core`), the design tokens (`@ondai/tokens`) and the CLI (`ondai`) they need.

## Set up

You need Node 22.13+ (`.nvmrc`) and pnpm 10 (`corepack enable` picks the right version).

```bash
pnpm install
pnpm dev            # website, docs and playground at http://localhost:3000, no device needed
pnpm dev:gallery    # the Expo gallery app (iOS 26 simulator or a device)
```

## Before you open a pull request

```bash
pnpm registry:build                     # regenerates registry/registry.json, registry/generated and apps/web/public/r
pnpm turbo typecheck lint test          # every package
pnpm --filter @ondai/registry test      # component tests (jest-expo)
pnpm changeset                          # if a published package changed: @ondai/core, @ondai/tokens or ondai
```

CI runs the same checks, fails if the generated registry is out of date, and runs visual regression and axe on the docs.

## Adding or changing a component

Components live in `registry/components/<name>/`. Copy the layout of a close sibling (for example `summarize` or `auto-tag`):

- `<name>.tsx`: the component. It supports every skin (`variant`), `size`, `tint`, `radius`, `icons`, `labels`, `styles` and render slots, like its siblings.
- `use-<name>.ts`: the headless hook. It talks to the model only through `@ondai/core` hooks (`useStructured`, `useStreamText`, `useToolAgent`…), never a provider directly.
- `prompts.ts`, `sample-data.ts`, `index.ts`, `README.md`.
- `playground.tsx`: controls, `variantKeys`, and a mock script for every state (idle, thinking, streaming, done, error, refusal, unavailable, preparing).
- `meta.json`: `capabilities`, and `runsOn` with **only** the providers the code can really serve today. Put anything it cannot do yet in `limits`; it shows on the docs page.
- `<name>.test.tsx`: renders on the scripted mock, covers the states and every skin.
- `apps/web/content/docs/components/<name>.mdx`, and the sidebar entry in `meta.json` next to it.

Then record the media the site uses (the web app must be running):

```bash
node scripts/thumbs.mjs <name>   # stills
node scripts/loops.mjs <name>    # hover loops
```

## Ground rules

- **Say exactly where it runs.** `runsOn` lists the providers a component supports, and `limits` says what the app passes in. The website previews run on the scripted mock, since no model runs in a browser.
- **Small models first.** Budget prompts for a 4,096-token context, validate model output with zod, and design a calm state for refusals and unavailability.
- **Accessibility.** Every control has an accessibility label and role, works with a screen reader, and respects reduced motion.
- **Privacy.** Nothing leaves the device unless the app has opted into a cloud provider. No telemetry.

## Commit messages

Short and in the present tense, prefixed with the area: `core: fall back to the next provider`, `registry: add translate`, `web: group the components menu`.

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By taking part you agree to it.
