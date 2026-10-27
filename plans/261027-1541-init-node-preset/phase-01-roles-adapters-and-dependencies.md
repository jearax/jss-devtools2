---
phase: 1
title: "Roles, adapters and dependencies"
status: completed
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Roles, adapters and dependencies

## Goal

Add the two approved roles, the git and package-manager adapters, and package-manager-detector, so later phases have every building block.

## Context

init needs file contents, a version table, two external tools it has not called yet (the package
managers, more of git) and two libraries. Decision 0024 decides where each goes; two of them have no
role yet.

## New roles (approved by the user on 2026-10-27)

| Suffix | Folder | Role |
|---|---|---|
| `.constant.ts` | `commands/<name>/constants/` | constant values one command owns, such as the version table and the config-name table |
| `.template.ts` | `commands/<name>/templates/` | the content of one file a command generates, as a function of its inputs |

Add both to `ROLE_SUFFIXES` in `tests/support/architecture-rules.ts` before the generic
`^commands/[^/]+\/` entry, to the table in decision 0024 (as an amendment note, the record keeps its
date) and to `docs/code-standards.md`, each with a negative fixture: a wrongly suffixed file in each
folder.

## Adapters

- `src/core/adapters/git.adapter.ts`, added beside `gitVersion` and `isInsideWorkTree`:
  `gitInit(cwd)` running `git init -q -b main`; `gitHooksPath(cwd)` reading
  `git config --get core.hooksPath` (unset is not an error); `gitTopLevel(cwd)` reading
  `git rev-parse --show-toplevel`.
- `src/core/adapters/package-manager.adapter.ts`, new: `packageManagerVersion(pm, cwd)` running
  `<pm> --version`; `installPackages(pm, cwd)` running the install and passing its output through
  (see phase 4); `runLocalBin(pm, bin, args, cwd)`; `detectPackageManager(cwd)` wrapping
  `package-manager-detector`'s `detect({ cwd, stopDir: cwd })`. Commands come from the library's
  `resolveCommand` (`install`, `execute-local`), so no command string is written by hand.
- `run-command.util.ts` stays the only spawner. Install output must reach the user unfiltered:
  add an option that inherits stdio for that one call, tested.

## Dependencies

- `package-manager-detector` 1.9.0 to `dependencies` (bundled; no dependencies of its own).
- Nothing else is bundled. `prettier-package-json` runs from the generated project after install
  (decision log, "prettier-package-json").
- Report the bundle size before and after.

## Files to Create / Modify

Create: `src/core/adapters/package-manager.adapter.ts`, fixtures for the two roles,
`tests/package-manager-adapter.test.ts`. Modify: `src/core/adapters/git.adapter.ts`,
`src/core/utils/run-command.util.ts`, `tests/support/architecture-rules.ts`,
`tests/git-adapter.test.ts`, `tests/run-command.util.test.ts`, `package.json`, `pnpm-lock.yaml`,
`docs/decisions/0024-core-and-command-layout.md`, `docs/code-standards.md`.

## Verification

- Adapter tests run real `git` in a temp folder: `gitInit` makes branch `main` whatever
  `init.defaultBranch` says (set it to `trunk` in the test's environment); `gitHooksPath` returns
  unset, then a value.
- `detectPackageManager` against the cases probed on 2026-10-27: four lockfiles gives bun; a
  `packageManager` field wins over lockfiles; a parent's lockfile is not seen; nothing gives `null`.

## Risk

The stdio-inheriting call is the first in the repo; a test must show a failing command still returns
its non-zero code.

## Tasks & Steps

- [x] Add `constants/` and `templates/` roles to `ROLE_SUFFIXES`, each with a negative fixture
- [x] Amend the role table in decision 0024 and in `docs/code-standards.md`
- [x] Add `gitInit`, `gitHooksPath`, `gitTopLevel` to `git.adapter.ts`, with real-git tests (branch `main` even with `init.defaultBranch=trunk`)
- [x] Add the stdio-inheriting option to `run-command.util.ts`; test that a failing command still returns its non-zero code
- [x] Create `package-manager.adapter.ts`: version, install, local bin, detect with `stopDir`, commands from `resolveCommand`
- [x] Add `package-manager-detector` 1.9.0 (exact) to `dependencies`; report the bundle size before and after
- [x] Run the full gate; commit
