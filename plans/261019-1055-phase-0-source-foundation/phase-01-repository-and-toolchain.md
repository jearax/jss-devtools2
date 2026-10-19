---
phase: 1
title: "Repository and toolchain"
status: completed
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Repository and toolchain

## Goal
Make `yyyy` a git repository with a pinned, working TypeScript toolchain (pnpm, TS 6.0, tsdown, ESLint, Prettier, husky, lint-staged, commitlint, vitest), and no source code yet.

## Context
- `yyyy` holds only `plans/`, and it is not a git repository.
- Style reference: the configs in `/Users/tandm/Documents/jearax/npm/jss-devtools` (`eslint.config.mjs`, `.prettierrc.json`: tabs, width 120, no semicolons, single quotes, no trailing commas), because the CLI will generate this toolchain for consumers and its own repo should be the first user of it. Use the official `typescript-eslint` flat config package, not the split parser and plugin imports.
- Versions checked on npm (2026-10-19): typescript 6.0.3 (pinned, not 7.x), typescript-eslint 8.71.2, eslint 10.13.0, prettier 3.9.10, tsdown 0.23.1, vitest 5.0.5, husky 9.1.7, lint-staged 17.6.0, @commitlint/cli 21.2.4. Re-check exact versions at install time and record the resolved ones in the lockfile.

## Files to create
- `.gitignore` (node_modules, dist, coverage, .DS_Store, *.log, .env, .env.*)
- `.editorconfig`, `.nvmrc` (`24`, the development runtime; consumers only need >=22.12), `.npmrc` only if pnpm needs a setting
- `LICENSE` (MIT, copyright jjuidev, as in jss-devtools)
- `package.json`: `name` `@jjuidev/jss-devtools`, `version` `0.0.0`, `private: true` (CI/CD never publishes to npm), `type: module`, `bin` `{ "jss-devtools": "dist/cli.mjs" }`, `engines.node` `>=22.12.0`, `packageManager` `pnpm@11.24.0`, scripts `build`, `dev`, `lint`, `lint:fix`, `format`, `typecheck`, `test`, `test:watch`, `prepare` (husky), and a `lint-staged` block
- `tsconfig.json` (strict, `module`/`moduleResolution` NodeNext, `target` ES2023, which Node 22 supports fully, `noEmit`, `verbatimModuleSyntax`), covering `src`, `tests` and config files
- `tsdown.config.ts` (entry `src/cli.ts`, ESM, platform node, target node22, `deps.alwaysBundle` covering runtime dependencies, version injected through `define` from package.json)
- `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`
- `commitlint.config.mjs` (`@commitlint/config-conventional`)
- `.husky/pre-commit` (`pnpm exec lint-staged`), `.husky/commit-msg` (`pnpm exec commitlint --edit "$1"`)
- `vitest.config.ts`

## Steps
- [x] `git init -b main` in `/Users/tandm/Desktop/yyyy`.
- [x] Write the config files above.
- [x] `pnpm add -D` the toolchain; `pnpm add commander@15 @clack/prompts@1.8` as runtime dependencies (used in phase 2).
- [x] Check that `pnpm install` gives no build-script approval prompts. If it does, approve only what the toolchain needs (pnpm 11 setting) and note why.
- [x] Phase 2 owns `src/`, so prove the toolchain here by running `pnpm lint` and `pnpm typecheck` on the config files only.
- [x] First commit: `chore: initialize repository and toolchain`.

## Verification
- `pnpm install --frozen-lockfile` succeeds.
- `pnpm lint` and `pnpm typecheck` exit 0.
- `echo "bad message" | pnpm exec commitlint` exits non-zero; `echo "chore: check hook" | pnpm exec commitlint` exits 0. `cat .husky/commit-msg` shows the hook calls commitlint.

## Risks
- The typescript-eslint peer range blocks TypeScript 7. That is accepted (F2). Renovate-style bumps must keep `typescript` below 6.1 until typescript-eslint widens its range.
- tsdown is 0.x, so pin it exactly.
