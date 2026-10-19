---
title: "Import path alias @/"
description: "Map @/* to src/* once in tsconfig, import across folders through it everywhere, ban parent-relative imports, and keep the architecture rules able to see aliased imports."
status: done
priority: P2
effort: 1h
branch: main
tags: [build, lint, imports]
blockedBy: []
blocks: []
created: 2026-10-21
---

# Import path alias `@/`

## Overview

Every import that leaves its own folder goes through `@/`, which maps to `src/`. Imports inside the
same folder stay `./`. ESLint rejects `../`, so the alias is the only way up. It runs after the core
layout plan, whose `src/commands/doctor/**` files carry the most `../../` imports.

## Inputs fixed by the user (2026-10-21)

| Question | Answer |
|---|---|
| Alias | "lên plan sử dụng alias import thông qua `@/` và apply cho tất cả code hiện tại" |
| Scope | "Cấm `../`, giữ `./`": `@/` for anything outside the current folder, `./` within it |

## Evidence (probed 2026-10-21 on a clone of `351ac19`, Node 22.22.1)

| Tool | Version | Result |
|---|---|---|
| TypeScript | 6.0.3 | `paths: { "@/*": ["./src/*"] }` without `baseUrl` typechecks under `NodeNext`; the `.js` extension stays mandatory (`@/core/errors/cli.error` fails with TS2307) |
| tsdown | 0.23.1 (rolldown 1.2.14) | Resolves the alias with no config: rolldown's `tsconfig` option defaults to auto-discovery and reads `paths` ([rolldown docs](https://rolldown.rs/reference/InputOptions.tsconfig)). The bundle has no `@/` left and the bundle tests pass |
| vitest | 5.0.5 (Vite 8.3.4) | Needs `resolve: { tsconfigPaths: true }` ([Vite shared options](https://vite.dev/config/shared-options)); without it, `Cannot find package '@/core/ui/banner.ui.js'` |
| eslint-plugin-import-x | 4.17.1 | Without `settings['import-x/internal-regex']: '^@/'`, `import-x/order` misplaces `@/` after `./`; with it, `@/` is its own group between external and sibling, and `--fix` sorts it |
| ESLint core | 10.13.0 | `no-restricted-imports` with pattern `../*` flags both `../x` and `../../x` |

## Phases

| # | Phase | Effort | Depends on | Status |
|---|---|---|---|---|
| 1 | [Alias, enforcement and rewrite](./phase-01-alias-enforcement-and-rewrite.md) | 1h | - | done |

## Acceptance criteria

- The alias is declared once, in `tsconfig.json`; tsdown and vitest read it from there.
- `git grep -nE "from '\.\./" -- src tests ':!tests/fixtures'` prints nothing.
- A `../` import in `src/` or `tests/` fails `pnpm lint`.
- `command-imports-no-other-command` still trips on an import written as `@/commands/<other>/…`,
  proven by a test.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm format:check` green on Node 22.22.1.

## Non-goals

An alias for `tests/` itself, aliases in `scripts/` or root config files, extensionless imports,
changing `./` sibling imports.

## Release note

No runtime change: the bundle is byte-for-byte the same logic. A push to `main` still deploys.
