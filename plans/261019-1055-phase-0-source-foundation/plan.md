---
title: "Phase 0: source foundation for the jss-devtools rewrite"
description: "Turn the empty yyyy workspace into a clean, verified TypeScript CLI repository that feature work can build on."
status: completed
priority: P1
effort: 7h
branch: main
tags: [foundation, tooling, cli, ci]
blockedBy: []
blocks: []
created: 2026-10-19
---

# Phase 0: source foundation

## Overview

The rewrite of `@jjuidev/jss-devtools` lives in `/Users/tandm/Desktop/yyyy`. The user's rule: "init source trên `yyyy` này, bản thân nó phải tốt / clean thì mới phát triển các tính năng khác được". This plan delivers the repository, toolchain, a minimal CLI entry point, tests, agent and docs setup, and CI. It builds no product features: no `init`, no harness, no presets.

Context: [knowledge base](../261019-1050-jss-devtools-rewrite/knowledge-base.md), [open questions](../261019-1050-jss-devtools-rewrite/open-questions.md) (F1 to F12 answered on 2026-10-19).

## Inputs fixed by the user (2026-10-19)

| Item | Value |
|---|---|
| Source location | `/Users/tandm/Desktop/yyyy` (F1) |
| Lint and format | ESLint flat + typescript-eslint + Prettier; TypeScript 6.0.x because typescript-eslint 8.71 requires `<6.1.0` (F2) |
| Dependencies | Node convention: runtime libraries in `dependencies`, tooling in `devDependencies` (F3). Native install means the bundle inlines runtime dependencies (`deps.alwaysBundle` in tsdown 0.23). |
| CLI and TUI | commander 15 + @clack/prompts 1.8 (F4) |
| Build | tsdown 0.23 (F5) |
| Runtime and tests | Consumers: Node >=22.12 (three supported lines back: 26, 24, 22). Development: Node 24. CI matrix 22, 24, 26. vitest 5 (F6, F10) |
| Distribution | Native install (curl, sh, wget); CI/CD never touches npm; deploys through a VPS with Dokploy (F7). Release and install site are not in this plan. |
| Package manager | pnpm 11.24.0, dev only (F9) |
| Remote and CI | New repo `jearax/jss-devtools2`; GitHub Actions for CI (F11) |
| Agent setup | AgentKit (`ak init`), docs in the global CLAUDE.md layout (F12) |

## Phases

| # | Phase | Effort | Depends on | Status |
|---|---|---|---|---|
| 1 | [Repository and toolchain](./phase-01-repository-and-toolchain.md) | 2h | - | completed |
| 2 | [CLI entry point and tests](./phase-02-cli-entry-point-and-tests.md) | 2h | 1 | completed |
| 3 | [Agent and docs foundation](./phase-03-agent-and-docs-foundation.md) | 1.5h | 2 | completed |
| 4 | [Remote and CI](./phase-04-remote-and-ci.md) | 1.5h | 3 | completed |

Four phases rather than three: CI depends on a remote repository and has a user-gated step (repo creation and visibility), so it stays separate from the local work.

## Acceptance criteria

- `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build` passes from a clean clone.
- `node dist/cli.mjs --help` and `--version` work. An unknown command exits non-zero with a suggestion. An uncaught error exits non-zero (the JSS exit-0 bug is covered by a test).
- `dist/cli.mjs` runs with no `node_modules` present, because runtime dependencies are inlined.
- An architecture test fails when a forbidden import is added (negative fixture) and passes on the real tree.
- The pre-commit hook runs lint-staged. A commit message that is not a conventional commit is rejected.
- README, CLAUDE.md and docs describe only what exists. No "TBD".
- CI on `jearax/jss-devtools2` is green for the first push to `main`.

## Non-goals

Product commands, presets, the harness module, release workflow, install.sh, Dokploy install site, version bump policy (F8).

## Open items raised inside this plan

- At phase 3: where decision records live (leaning `docs/decisions/`).
- At phase 4: visibility of `jearax/jss-devtools2`, and confirmation before creating it.
