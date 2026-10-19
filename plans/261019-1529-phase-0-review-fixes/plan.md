---
title: "Phase 0 review fixes"
description: "Fix the defects the phase 0 review reproduced, and give each formatting fact a single home."
status: completed
priority: P1
effort: "2h"
tags: [foundation, fix, tooling, ci]
created: 2026-10-19
---

# Phase 0 review fixes

## Overview

The review of phase 0 and the toolchain alignment reproduced each defect on a clean clone:
[review report](../reports/code-reviewer-261019-1519-phase-0-and-toolchain-review.md). This plan
fixes them. One phase, because every fix is small and they share the same verification run.

## User answers (2026-10-19)

| Question | Answer |
|---|---|
| Tab width in three files with two values | "tab width cần single trust source => delegate full for you." Chosen: `.editorconfig` is the only home (decision 0017) |
| Other facts still in more than one file | "Chỗ tôi cần \"single source trust\" cho `prettierrc, VSCode settings, editorconfig` bạn làm chưa?" Chosen: every fact Prettier and the editor share moves to `.editorconfig` |
| Symlink fix: minimal or split the entry | "delegate full for use." Chosen: minimal, `realpathSync` plus a symlink test. Splitting the entry belongs to the core module layout plan |
| Replace the lint globs with `eslint .` | "Giữ hiện tại." The globs stay. Only the lint-staged overlap is fixed, by joining its two keys into one |

## Changes

| Finding | Change | Files |
|---|---|---|
| CLI silent with exit 0 through a symlink | Resolve `argv[1]` with `realpathSync`; bundle test runs through a symlink | `src/cli.ts`, `tests/bundle.test.ts` |
| Type-only imports impossible | `consistent-type-imports` `prefer: type-imports` | `eslint.config.mjs` |
| Vitest rules on `src/` | `TEST_FILES` from the test folders and `*.test.*`/`*.spec.*` | `eslint.config.mjs` |
| lint-staged keys overlap; unpinned `pnpm dlx` | One joined code key; `!(package).json`; `package.json` runs pinned `prettier-package-json` then Prettier | `package.json` |
| `.env.production` committable | `.env*` with `!.env.example` | `.gitignore`, `.prettierignore` |
| Consumer floor never run | `consumer-floor` CI job on the exact `engines.node` version; `@types/node` 22.20.5 | `.github/workflows/ci.yml`, `package.json` |
| Formatting facts in up to three files | Charset, LF, indentation, width, final newline and whitespace only in `.editorconfig`; ruler dropped | `.editorconfig`, `.prettierrc.json`, `.vscode/settings.json` |
| Docs claimed stray files are not type-checked; decision 0006 stale | Corrected | `docs/`, `README.md`, `CLAUDE.md` |

## Verification

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` and `pnpm format:check`, green, 15 tests.
- [x] Symlinked `dist/cli.mjs`: `--version` prints `0.0.0` exit 0, unknown command exit 1.
- [x] The symlink test fails against the previous `src/cli.ts` and passes against the fix.
- [x] `import type { OptionValues } from 'commander'` passes ESLint and `tsc`.
- [x] `it()` in `src/` no longer gets vitest rules; `tests/cli.test.ts` still gets 17.
- [x] lint-staged with the joined key stages root, `src/` and `tests/` files once each, and skips `scratch/`.
- [x] `package.json` is byte-identical after `prettier-package-json --write` then `prettier --write`.
- [x] The `consumer-floor` step run locally on official Node 22.12.0 (checksum verified) passes on the
  fixed bundle and fails on the previous one.
- [ ] CI run on `jearax/jss-devtools2` for the new `consumer-floor` job. Needs a push.

## Not done here

- `minimumReleaseAgeExclude` lists commitlint 21.2.4 packages; remove the entries once they age past
  pnpm's release-age window.
- `@clack/prompts` stays declared but unused until the first prompt; the package name and description
  are still written in both `package.json` and `src/cli.ts`.
