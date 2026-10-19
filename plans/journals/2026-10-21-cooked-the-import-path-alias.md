---
title: Cooked the import path alias
date: 2026-10-21
summary: "Declared the @/ alias once in tsconfig, rewrote every parent-relative import in src/ and tests/, banned ../ with ESLint, and taught the architecture scanner to see an aliased import"
---

# Cooked the import path alias

## What happened

The [import path alias plan](../261021-1122-import-path-alias/plan.md) was cooked. `@/` is declared
once, in `tsconfig.json`, and maps to `src/`. An import that leaves its folder goes through the
alias, an import in the same folder stays `./`, and ESLint rejects a parent-relative `../` import
so the next one cannot come back. The architecture scanner maps `@/x` to the logical path `x`, so
`command-imports-no-other-command` still sees an aliased import of another command.

## Findings
- **The plan's two rules disagreed.** The Overview says an import that leaves its folder goes
  through `@/`, and the step says to leave `./` imports alone. The Overview won: `./` stays only
  for same-folder imports. The user's rule was the same: "Cấm `../`, giữ `./`".
- **`@/` cannot reach `tests/support/`.** The alias maps to `src/` and an alias for `tests/` is a
  non-goal, so the test helpers are still imported as `./support/…`. That is the one place a
  relative import leaves its folder.
- **`scripts/package-info.d.mts` imported from `src/` with `../`.** The ban covers `scripts/` too,
  so it uses the alias. The `.mjs` beside it imports nothing from `src/`.
- **A fixture file cannot hold an aliased import of another command.** `@/` resolves to the real
  `src/`, where `commands/other/` does not exist, so such a fixture would not typecheck. The test
  calls the rule's own check with the aliased specifier instead.
- **tsdown needed nothing.** rolldown discovers the tsconfig by itself: the bundle has no `@/` left
  and the bundle suite passes.
- **Both `../x` and `../../x` are caught** by the `../*` pattern, verified with a temporary import
  in `src/` that was removed afterwards.

## Also
- `docs/code-standards.md` states the import rule next to the `NodeNext` note, the facts table in
  `docs/system-architecture.md` records where the alias is declared, and decision 0025 records the
  choice with the user's words.
- No comment was added: the configs and the scanner change need none.
- The gate is green on Node 22.22.1: lint, typecheck, 92 tests, build, format.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
