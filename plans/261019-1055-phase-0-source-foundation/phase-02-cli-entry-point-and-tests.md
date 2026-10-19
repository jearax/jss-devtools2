---
phase: 2
title: "CLI entry point and tests"
status: completed
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: CLI entry point and tests

## Goal
Ship the smallest real CLI (root command with `--help` and `--version`, no product commands), plus the tests that lock in the behavior the rewrite depends on: exit codes, standalone bundle, and architecture boundaries.

## Context
- commander 15 verified in a probe (2026-10-19): nested help, aliases, "Did you mean", `--no-*` negation, unknown option exits 1.
- JSS lesson: a global `uncaughtException` handler turned crashes into exit 0. The entry point must keep a non-zero exit on failure.
- K1 lesson: enforce architecture with a test that has positive and negative fixtures, not with docs alone.
- Layout here is the minimum needed now. The module layout for features (`core`, `commands`, `modules`) is decided in the next plan, so this phase creates only what it uses.

## Files to create
- `src/cli.ts`: builds the commander program (name `jss-devtools`, description, version from the build define, `showHelpAfterError`, `showSuggestionAfterError`). Exports `createProgram()` for tests. Runs `parseAsync` only when executed directly. Has a top-level catch that prints one line to stderr and sets `process.exitCode = 1` (with the stack when `JSS_DEBUG=1`).
- `tests/cli.test.ts`: in-process tests against `createProgram()` (help text lists usage, version matches package.json, unknown command rejects with a suggestion).
- `tests/bundle.test.ts`: builds once, copies `dist/cli.mjs` into a temp directory with no `node_modules`, then runs it with `node` for `--version`, `--help` and an unknown command (exit code 1). This proves dependencies are inlined.
- `tests/architecture.test.ts` plus `tests/fixtures/architecture/`: scans `src/**/*.ts` for imports. First rules: nothing under `src/` except `src/cli.ts` calls `process.exit` or registers `uncaughtException`/`unhandledRejection` handlers. The fixture folder holds one file that breaks each rule, and the test asserts that the scanner reports it. Feature boundaries are added to this file when the next plan defines them.

## Steps
- [x] Write `src/cli.ts`.
- [x] Write the three test files and the fixtures.
- [x] `pnpm build`, then `pnpm test`.
- [x] Commit: `feat: add cli entry point with help and version`, then `test: lock exit codes, bundle and architecture rules` (or one commit if smaller).

## Verification
- `pnpm test` passes.
- `node dist/cli.mjs --version` prints `0.0.0`; `node dist/cli.mjs nope; echo $?` prints an error with "Did you mean"-style help and `1`.
- Temporarily adding `process.exit(0)` to a new file under `src/` makes `tests/architecture.test.ts` fail (revert afterwards).

## Risks
- The bundle test needs a build first. Run it through a vitest `globalSetup` that calls tsdown's API once, so `pnpm test` stays self-contained.
