# Changesets

Every pull request that changes a published package (`@ondai/core`, `@ondai/tokens`, `ondai`) adds a changeset:

```bash
pnpm changeset
```

On `main`, the release workflow opens a "Version packages" pull request that bumps versions and writes the CHANGELOGs. Merging it builds the packages and publishes them with `pnpm publish` (which rewrites `workspace:*` and `catalog:` versions and applies `publishConfig`; never publish with plain `npm publish`).
