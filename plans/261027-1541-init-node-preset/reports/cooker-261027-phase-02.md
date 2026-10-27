# Cooker report — Phase 2: Preset contents and the version table

Date: 2026-10-27. Working copy synced via Mutagen; nothing committed, nothing pushed. No new
repository dependency: the pin script uses only Node builtins and the `npm` CLI already on PATH.

## Version table (script run 2026-10-27)

`scripts/pin-node-preset.mjs` — pure Node: `npm view` for metadata, a small comparator parser for
peer and engines ranges, no new dependency. Algorithm: latest stable → drop releases younger than
1440 minutes → iterate peer ranges in both directions until fixed point → engines.node floor of
every pinned version at or below `PACKAGE.nodeFloor` (24.11.0). Highest package engines floor major
found: 22 (lint-staged 17, @commitlint/cli). Peer resolution converged in 2 passes.

| Package                               | Pinned    | Latest    | Stepped down |
| ------------------------------------- | --------- | --------- | ------------ |
| @commitlint/cli                       | 21.2.4    | 21.2.4    | 0            |
| @commitlint/config-conventional       | 21.2.4    | 21.2.4    | 0            |
| @eslint/js                            | 10.0.1    | 10.0.1    | 0            |
| @types/node                           | 24.19.2   | 26.6.5    | major 24     |
| eslint                                | 10.13.0   | 10.13.0   | 0            |
| eslint-config-prettier                | 10.1.8    | 10.1.8    | 0            |
| eslint-plugin-autofix                 | 2.2.0     | 2.2.0     | 0            |
| eslint-plugin-import-x                | 4.17.1    | 4.17.1    | 0            |
| eslint-plugin-prefer-arrow-functions  | 3.10.2    | 3.10.2    | 0            |
| eslint-plugin-prettier                | 5.5.7     | 5.5.7     | 0            |
| globals                               | 17.13.0   | 17.13.0   | 0            |
| husky                                 | 9.1.7     | 9.1.7     | 0            |
| lint-staged                           | 17.6.0    | 17.6.0    | 0            |
| prettier                              | 3.9.10    | 3.9.10    | 0            |
| prettier-package-json                 | 2.8.0     | 2.8.0     | 0            |
| tsc-alias                             | 1.9.9     | 1.9.9     | 0            |
| tsx                                   | 4.23.15   | 4.23.15   | 0            |
| typescript                            | 6.0.3     | 7.0.2     | 1 (peer cap `<6.1.0`) |
| typescript-eslint                     | 8.72.0    | 8.72.1    | 1 (8.72.1 younger than 1440 min) |

`@eslint/js` 10.0.1 already sits on eslint's major (10.x); no lockstep step needed today. The table
matches the provisional first pass except `typescript-eslint`, which 8.72.1 pushed today.

## Files

Created:

- `scripts/pin-node-preset.mjs`
- `src/commands/init/constants/node-preset-dependency.constant.ts`
- `src/commands/init/constants/config-name.constant.ts` — the 12a/13a tables: 6 ESLint names, 17
  Prettier files + the `prettier` key, 16 commitlint files + the `commitlint` key
- `src/commands/init/templates/` — 14 templates, one per row: `package-json`, `tsconfig-json`,
  `src-main`, `eslint-config-mjs`, `prettierrc-json`, `editorconfig`, `commitlint-config-mjs`,
  `vscode-settings-json`, `vscode-extensions-json`, `gitignore`, `prettierignore`,
  `husky-pre-commit`, `husky-commit-msg`, `pnpm-workspace-yaml`
- `tests/node-preset-templates.test.ts` (snapshot, 26 snapshots), `tests/node-preset-versions.test.ts`
- `tests/__snapshots__/node-preset-templates.test.ts.snap`

Templates are pure functions of their inputs; nothing calls an adapter. The husky hooks take the
resolved local-bin command as a plain string (`pnpm exec`, `npx`, `yarn exec`, `bunx`), the caller
(phase 4) gets it from `resolveLocalBin`. Static files carry `main`'s bytes exactly; the
`eslint-config-mjs` template was generated from `main`'s file by a throwaway transform so the
removals (vitest plugin import, `TEST_FILES` block, `tests/fixtures` override, `plans/**`,
`.agentkit/**` ignores) are provably the only diffs.

## Small decisions made here, and why

- **`format` script keeps the manager's run command.** `main` says `pnpm lint:fix && prettier
  --write .`; a generated npm project cannot run that. The template maps npm → `npm run`, pnpm →
  `pnpm`, yarn → `yarn`, bun → `bun run`; pnpm output is byte-identical to `main`.
- **Test folders stay in the generated lint globs.** The plan removes the `TEST_FILES` ESLint block
  but says nothing about `TEST_FOLDERS` inside `SOURCE_FOLDERS`; keeping it follows the house rule
  that a listed folder that does not exist is harmless, so a generated project can add `tests/`
  later without touching the glob list.
- **`output-in-ui-layer-only` now exempts `*.template.ts`.** `src-main.template.ts` must contain
  `console.log` as generated text; the rule's purpose is real output, and template files are data.
  Same reasoning as the phase 1 role amendment; the rule's fixture still asserts the behavior on
  regular files. Flagged here for planner review.
- **`.prettierignore` test reads the ignore list out of the generated ESLint text** (`IGNORED_PATHS`
  const) and asserts `tsconfig.json` has no `exclude`, instead of duplicating the folder list in
  the test.

## Gate output (real)

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` — all green:

- `pnpm lint`: clean
- `pnpm typecheck` (`tsc --noEmit`): clean
- `pnpm test`: `Test Files  15 passed (15)` / `Tests  149 passed (149)`, 26 snapshots written and
  verified on the second run
- `pnpm build`: `dist/cli.mjs  119.67 kB │ gzip: 29.86 kB`, `✔ Build complete`

Bundle size: **119675 bytes, unchanged from phase 1** — nothing imports the templates yet; they
join the bundle in phases 3–4, so this phase adds zero bundled bytes.

## What the plan did not say

- The generated `package.json` key order is the template's literal order; canonical order comes
  from `prettier-package-json` at phase 4, per decision 20c. Provisional with 25a: the user reviews
  the snapshots at commit.
- The pin script's range parser supports the comparator subset the 19 packages actually use
  (`^ ~ >= > < =` exact, `||`, AND). It is not a full semver implementation; the end-to-end test of
  phase 5 is the real proof (step 5 of decision 14).
- `npm view` returned no `engines` for some packages; the script treats a missing `engines.node`
  as `>=0`, which cannot violate the floor.

## Unresolved questions

- None blocking. The `output-in-ui-layer-only` scope change and the `format` run-command mapping
  above are the two judgment calls I would most like the planner to glance at before commit.

## Review fixes (2026-10-27, planner review)

Accepted by planner: the `*.template.ts` exemption in `output-in-ui-layer-only` (comment kept) and
the per-manager `format` run command. Version table OK. Applied:

1. **Yarn hook line lost its arguments.** `yarn exec <bin>` without the library's `--` separator
   swallows everything after it, so the generated `commit-msg` hook ran commitlint without
   `--edit "$1"`. The hook templates now take the fully resolved command line (`command: string`)
   and the caller builds it with a new pure `localBinCommandLine(pm, bin, args)` in the adapter,
   which joins `resolveLocalBin`'s `command` and `args` with spaces. Pure tests: yarn gives
   `yarn exec commitlint -- --edit "$1"` (separator kept), pnpm gives `pnpm exec lint-staged`.
2. **Hook snapshots built from the adapter, not a hand-written table.** The `LOCAL_BIN` map in the
   snapshot test (which had yarn as `yarn exec` and bun as `bunx`) is gone; the inputs come from
   `localBinCommandLine`. The regenerated snapshots now show the library's real output: yarn
   `yarn exec commitlint -- --edit "$1"`, bun `bun x lint-staged`.
3. **`RUN_COMMAND` typed strictly.** The template exports `PackageManagerName` as the four-manager
   union (`npm | pnpm | yarn | bun`), `packageManager` in the input uses it, `RUN_COMMAND` is
   `Readonly<Record<PackageManagerName, string>>`, and the `?? 'npm run'` fallback is gone. (The
   adapter's `AgentName` also covers `deno`, `nub`, `aube` and `upm`, which init does not support,
   so the union lives in the template instead of the adapter type.)
4. **The four-line JSDoc on `NODE_PRESET_DEPENDENCIES` is one line**: `// Written by
   scripts/pin-node-preset.mjs; rerun it instead of editing by hand.`

Gate after the review fixes, real output:

- `pnpm lint`: clean
- `pnpm typecheck` (`tsc --noEmit`): clean
- `pnpm test`: `Test Files  15 passed (15)` / `Tests  151 passed (151)`, 26 snapshots
- `pnpm build`: `dist/cli.mjs  119.67 kB │ gzip: 29.86 kB`, `✔ Build complete`; bundle 119675 bytes,
  unchanged
