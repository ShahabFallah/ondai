# Security policy

## Supported versions

Ondai is pre-1.0. Fixes land in the latest release of `@ondai/core`, `@ondai/tokens` and `ondai` (the CLI), and in the components in the registry. Components are copied into your app, so pull a fix with `npx ondai diff <name>` and `npx ondai add <name> --overwrite`.

## Reporting a vulnerability

Please do **not** open a public issue. Use GitHub's private reporting: **Security → Report a vulnerability** on this repository. Include what is affected, how to reproduce it, and the impact you expect.

You will get an acknowledgement within 3 working days and a plan within 10. Once a fix ships, we credit you in the release notes unless you prefer not to be named.

## What is in scope

- `@ondai/core`: the provider router, the hooks, tool execution and confirmation (`risk` levels), and output parsing.
- The CLI: what it downloads, writes and installs.
- Component code in the registry, including prompt handling.

Prompt injection deserves special care: text from a page, a message or a photo reaches the model. Components with tools (CommandBar, AgentRun) only run actions you register, and actions marked `risk: 'high'` always ask first. Mark anything that spends money, sends messages or deletes data as high risk.
