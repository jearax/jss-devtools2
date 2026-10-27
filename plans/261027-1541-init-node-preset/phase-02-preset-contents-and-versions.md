---
phase: 2
title: "Preset contents and the version table"
status: completed
priority: P1
effort: "6h"
dependencies: [1]
---

# Phase 2: Preset contents and the version table

## Goal

Write every generated file's template and the pinned version table, sourced from `main` exactly as the table lists.

## Context

The files init writes are the decided list below, nothing more. `main` only supplies their contents
(decision 25a, provisional): a file `main` has that the list lacks is not a gap. The user reviews this
table again at commit, so keep it exact: every removal from a source file listed, nothing removed
silently.

## Where each file comes from

`src/commands/init/templates/<file>.template.ts` returns each file's content. Inputs: the project
name, the package manager, the Node floor (`PACKAGE.nodeFloor`, decision 16d).

| Generated file | Mode | Source on `main` | Removed or changed |
|---|---|---|---|
| `package.json` | create: written; existing: merged | `package.json` | `name` from `<dir>`'s base name, `version` `0.0.0`, `private: true`, `type: module`, `engines.node` the floor, `packageManager` `<pm>@<version>`. Scripts: `dev` `tsx watch src/main.ts`, `build` `tsc && tsc-alias --resolve-full-paths`, `start` `node dist/main.js` (create only), `typecheck` `tsc --noEmit`, `lint`/`format` with `main`'s globs, `prepare` `husky`. `lint-staged` from `main` as is (its `package.json` entry already runs `prettier-package-json` then `prettier`). Removed: `bin`, `build`/`dev` via tsdown, `stage:release`, `test*`, `format:check`, `keywords`, `license`, `description`, `dependencies` |
| `tsconfig.json` | create only | `tsconfig.json` | `module` `esnext`, `moduleResolution` `bundler` (6c), `rootDir` `src`, `outDir` `dist`, `include` `["src"]`; removed `noEmit` and the `plans`/`.agentkit`/`coverage` excludes |
| `src/main.ts` | create only | new | one exported function and one log line, enough for `tsc` to have an input |
| `eslint.config.mjs` | owned | `eslint.config.mjs` | removed: the `@vitest/eslint-plugin` import and the `TEST_FILES` block, the `tests/fixtures` override, `plans/**` and `.agentkit/**` in the ignores |
| `.prettierrc.json` | owned | `.prettierrc.json` | none |
| `.editorconfig` | owned | `.editorconfig` | none |
| `commitlint.config.mjs` | owned | `commitlint.config.mjs` | none |
| `.vscode/settings.json` | owned, skipped by `--no-vscode` | `.vscode/settings.json` | `npm.packageManager` set to the chosen manager |
| `.vscode/extensions.json` | owned, skipped by `--no-vscode` | `.vscode/extensions.json` | none |
| `.gitignore` | create: written; existing: missing lines appended | `.gitignore` | removed: `release/` and its comment, `.claude/`, `.agentkit/`, `*.tgz` |
| `.prettierignore` | create: written; existing: missing lines appended | `.prettierignore` | aligned with the preset's other ignore lists (`.gitignore`, ESLint `globalIgnores`, `tsconfig.json` excludes): `node_modules/`, `dist/`, `coverage/`, `.env*`, `.eslintcache`, `*.log`, and the four lockfiles `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`; removed `.agentkit/`, `plans/`. A test asserts every folder ignored by ESLint and `tsconfig.json` is also here |
| `.husky/pre-commit`, `.husky/commit-msg` | create: written; existing: merged | `.husky/*` | `pnpm exec` replaced by the manager's `execute-local` command |
| `pnpm-workspace.yaml` | pnpm, create only | `pnpm-workspace.yaml` | kept: `allowBuilds: unrs-resolver: true`, `strictPeerDependencies`, `engineStrict`; removed: `minimumReleaseAgeExclude` |

Existing mode never writes `tsconfig.json`, `src/main.ts`, `pnpm-workspace.yaml` or the
`dev`/`build`/`start` scripts.

## Version table

`src/commands/init/constants/node-preset-dependency.constant.ts`: one map, package to exact version.
`@types/node` is `^<floor major>`'s newest, never latest. The generated `package.json` writes `^`
plus the exact version (15b).

Packages: `@commitlint/cli`, `@commitlint/config-conventional`, `@eslint/js`, `@types/node`, `eslint`,
`eslint-config-prettier`, `eslint-plugin-autofix`, `eslint-plugin-import-x`,
`eslint-plugin-prefer-arrow-functions`, `eslint-plugin-prettier`, `globals`, `husky`, `lint-staged`,
`prettier`, `prettier-package-json`, `tsc-alias`, `tsx`, `typescript`, `typescript-eslint`.

How to pin (14), recorded as a script in `scripts/` so the next bump repeats it:

1. Take every package's latest stable.
2. Drop any version published less than 1440 minutes ago (pnpm `minimumReleaseAge`).
3. Check peers across the set, including the reverse direction (`typescript-eslint` caps
   `typescript <6.1.0`, which `typescript`'s own metadata does not show). Step a package down until
   every range holds.
4. Check the highest `engines.node` in the set is at or below `PACKAGE.nodeFloor`.
5. Prove it with the phase 5 end-to-end test.

First pass on 2026-10-27, peers only: all latest except `typescript` 6.0.3. Redo the pass when
implementing; the date moves.

## Config-name table

`src/commands/init/constants/config-name.constant.ts`: for ESLint, Prettier and commitlint, every
file name and `package.json` key from the decision log's table. One table, read by preflight to
detect and by the writer to delete.

## Verification

- A snapshot test per template, per package manager where the output differs.
- A test that the version table holds no `latest`, no range, and that `@types/node`'s major equals
  the floor's major.

## Risk

`main` changes after this phase. Accepted with 25a: the preset is a copy.

## Tasks & Steps

- [x] Pin the version set with a script in `scripts/` (latest, older than 1440 minutes, peers both ways, engines at or below the floor)
- [x] Create `constants/node-preset-dependency.constant.ts` and `constants/config-name.constant.ts`
- [x] Create one `templates/*.template.ts` per row of the table
- [x] Snapshot test per template and per package manager where output differs
- [x] Test: no `latest` or range in the version table; `@types/node` major equals the floor major; `.prettierignore` covers every folder ESLint and `tsconfig.json` ignore
- [x] Run the full gate; commit
