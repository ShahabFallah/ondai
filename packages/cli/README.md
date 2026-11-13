# ondai

**AI components for on-device foundation models.** Apple Intelligence and Gemini Nano, wired into production-ready React Native UI. Private, offline, instant.

```bash
npx ondai init                        # provider, polyfills and ondai.json
npx ondai add command-bar summarize   # the components and everything they need
npx ondai list                        # every component in the registry
npx ondai diff command-bar            # what changed upstream since you added it
npx ondai doctor                      # checks your Expo setup
```

The code lands in your repo (`components/ondai/`), so it is yours to shape. Works with npm, pnpm, yarn and bun. Set `ONDAI_REGISTRY` or `--registry` to use another registry.

Docs and live previews: https://ondai.dev
