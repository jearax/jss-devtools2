---
title: Aligned toolchain with design-system
date: 2026-10-19
summary: "Named config exports, fuller ESLint and editor settings, and .npmrc plus .nvmrc removed in favour of pnpm-workspace.yaml and devEngines.runtime"
---

# Aligned toolchain with design-system

## What happened
Executed plans/261019-0625-toolchain-alignment. One commit on main: refactor: align toolchain with design-system and drop npmrc and nvmrc.

Three asks from the user, all implemented:
- Config files export a named const: eslintConfig, commitlintConfig, tsdownConfig, vitestConfig.
- Toolchain completed against the design-system reference: semis back on, fuller .editorconfig, new .vscode settings and extensions, husky shebangs, prettier ignore regrouped, five new ESLint plugins.
- .npmrc and .nvmrc deleted; settings relocated to files that actually read them.

## Decisions
- Toolchain modelled on design-system (docs/decisions/0014). One deliberate deviation kept: moduleResolution stays NodeNext, not Bundler, because this repo ships a real Node ESM artifact.
- No .npmrc and no .nvmrc (docs/decisions/0015).
- Config files export a named const (docs/decisions/0016).

## Findings worth keeping
- pnpm reads only auth and registry settings from .npmrc. Everything else is pnpm-workspace.yaml, where engineStrict and strictPeerDependencies are documented keys. That is not a preference, it is how pnpm is configured.
- devEngines.runtime works as the .nvmrc replacement, but onFail matters. With onFail download, pnpm resolves the range to a concrete release and installs it: ^24.0.0 resolved to Node 24.0.0, which engineStrict then rejected against tsdown's ^24.11.0. Settled on onFail warn with ^24.11.0. The CI log for run 39210086611 shows "Installing runtime node@^24.11.0", so the declaration does drive CI with zero workflow input.
- Typed lint rules paid for themselves immediately. no-unsafe-call flagged a reach into commander private method unknownCommand in src/cli.ts, and unbound-method flagged the test stream capture. The commander reach was a real design smell and is gone: the command:* fallback is now registered at parse time only while the program has no subcommands, so commander owns the suggestion path untouched once commands exist.
- eslint-plugin-import-x pulls unrs-resolver, which needs a build script. Allow-listed in allowBuilds, same as the reference repo.
- commitlint enforces body-max-line-length at 100. The first commit attempt was rejected by the repo's own hook for a long body line.

## Verification
- Clean clone: pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build, all green.
- No .npmrc or .nvmrc in the clone; pnpm install needs no build-script approval.
- dist/cli.mjs still runs standalone with no node_modules; unknown command exits 1 and is named.
- Architecture test still fails on a temporary process.exit(0) under src/ and passes once reverted.
- commitlint rejects a non-conventional message and accepts a conventional one in the working tree and in a fresh clone.
- CI run 39210086611 green on Node 22, 24 and 26.

## Next steps
- Next plan: core module layout. X1 (exit codes) and X2 (which old decisions carry over) are open and shape it. Once the first product command lands, re-check the unknown-command suggestion path, which no product command can exercise today.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
