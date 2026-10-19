---
phase: 1
title: "Alias, enforcement and rewrite"
status: done
priority: P2
effort: "1h"
dependencies: []
---

# Phase 1: Alias, enforcement and rewrite

## Goal
`@/` resolves in typecheck, bundle, tests and lint; no `../` import is left or can come back; the
architecture rules see through the alias.

## Context
- The scanner in `tests/support/architecture-rules.ts` resolves import specifiers to logical paths
  for `command-imports-no-other-command`, and skips every specifier that does not start with `.`.
  An aliased import would pass that rule unseen. `core-imports-no-command` and
  `runner-in-adapters-only` match the specifier text, so they keep working.
- Fixtures under `tests/fixtures/architecture/src/` import fixture targets with `../` on purpose:
  `@/` would resolve to the real `src/`, where those targets do not exist.

## Steps
- [x] `tsconfig.json`: `"paths": { "@/*": ["./src/*"] }`. No `baseUrl`. **Done (2026-10-21).**
- [x] `vitest.config.ts`: `resolve: { tsconfigPaths: true }`. tsdown needs nothing; the bundle
      tests prove it. **Done (2026-10-21).** tsdown needed no config: the bundle has no `@/` left
      and the bundle suite passes.
- [x] `eslint.config.mjs`, in the block that registers `import-x`:
      `settings: { 'import-x/internal-regex': '^@/' }` and
      `'no-restricted-imports': ['error', { patterns: [{ group: ['../*'], message: … }] }]`, the
      message naming `@/`. A later block turns `no-restricted-imports` off for
      `tests/fixtures/**`. **Done (2026-10-21).** The rule bans `../x` and `../../x` alike, and a
      temporary `../` import in `src/` fails `pnpm lint` with the message naming `@/`.
- [x] Scanner: the import-to-logical-path step maps `@/x` to `x` before the relative case, so both
      spellings reach the same check. Add a test that `command-imports-no-other-command` flags
      `@/commands/other/other.service.js` from a file in `commands/doctor/`, and does not flag
      `@/core/…`. **Done (2026-10-21).** The mapping lives in `logicalTargetOf`, and the test calls
      the rule's own check with the aliased specifier: a fixture file with that import would not
      typecheck, because `@/` resolves to the real `src/`, where `commands/other/` does not exist.
- [x] Rewrite every `../` import in `src/` and `tests/` (fixtures excluded) to `@/` with the `.js`
      extension; leave `./` imports alone. Then `pnpm exec eslint --fix src tests` to regroup.
      **Done (2026-10-21), with one difference.** The plan's Overview and the user's rule are "an
      import that leaves its own folder goes through `@/`, an import in the same folder stays `./`",
      so `./` was kept only for same-folder imports (`src/core/ui/terminal.ui.js`,
      `src/commands/doctor/doctor.service.js`) and the ones that leave the folder were rewritten
      too (`./checks/…`, `./types/…`, `./commands/…`). The test helpers under `tests/support/` stay
      `./`, because `@/` maps to `src/` and an alias for `tests/` is a non-goal.
- [x] Docs: `docs/code-standards.md` gains the import rule next to the `NodeNext` note (one or two
      lines: `@/` outside the folder, `./` inside, never `../`; the `.js` extension stays);
      `docs/system-architecture.md` facts table gains "Import alias: `@/*` → `src/*`, declared in
      `tsconfig.json`"; decision 0025 records the choice, quoting the user. **Done (2026-10-21).**
- [x] Comments: none added. The configs and the scanner change need none. **Done (2026-10-21).**

## Verification
- `git grep -nE "from '\.\./" -- src tests ':!tests/fixtures'` is empty. **True on 2026-10-21.**
- A temporary `../` import in `src/` fails `pnpm lint` with the message naming `@/`; removed after.
  **True on 2026-10-21**, for `../x` and `../../x` alike.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm format:check` on Node 22.22.1;
  `grep -c "@/" dist/cli.mjs` is 0. **True on 2026-10-21**: 92 tests, `dist/cli.mjs` 119.33 kB, no
  `@/` in the bundle.

## Risks
- A tsdown or rolldown upgrade that stops auto-discovering tsconfig leaves `@/` in the bundle. The
  bundle tests run `dist/cli.mjs` with no `node_modules`, so they fail loudly.
- Vite's `paths` support only covers files the tsconfig `include` matches; `include` is `**/*`, so
  `src/` and `tests/` are covered.

## Outcome

Done on 2026-10-21. The alias is declared once, in `tsconfig.json`, and TypeScript, tsdown, vitest,
ESLint and the architecture scanner all read it from there. No `../` import is left in `src/` or
`tests/`, and ESLint refuses the next one.

One thing the plan did not name: `scripts/package-info.d.mts` imported a type from `src/` with
`../`, and the ban covers `scripts/` too, so it uses the alias now. Its runtime file, the `.mjs`
next to it, imports nothing from `src/`.
