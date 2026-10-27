---
phase: 3
title: "Arguments, preflight and the plan"
status: completed
priority: P1
effort: "6h"
dependencies: [1, 2]
---

# Phase 3: Arguments, preflight and the plan

## Goal

Turn arguments into a mode, run every read-only check in order, and return a plan of `+`, `~`, `-` entries, with `--dry-run` stopping there.

## Context

Everything in this phase is read only. A failure exits 1 before a byte is written, with what was
found and the next step. The decision log holds every message; copy them, do not reword.

## Arguments

| Input | Result |
|---|---|
| unknown flag | commander's error and suggestion, exit 1 |
| `--framework` other than the five | commander's choices error, exit 1 |
| `--framework react` (or `rn`, `next`, `nest`) | exit 1 "react is not supported yet; only node is" |
| `--pm` without `<dir>` | exit 1 "--pm only applies when creating a project; here the package manager is detected" |
| `-f` with `<dir>` | exit 1, worded like the `--pm` row |

## Preflight, create mode (`init <dir>`)

In order, stopping at the first failure:

1. `<dir>` is missing, or an empty folder (`init .` in an empty folder works). Otherwise "my-app is
   not empty; to set up the project in it: cd my-app && jss-devtools init".
2. `git` is on `PATH` (`gitVersion`).
3. The package manager: `--pm`, else asked (phase 4), else `npm` with `-y`. `<pm> --version`
   answers, else "pnpm is not installed; install it, or pick another with --pm".

## Preflight, existing mode (`init`)

1. `./package.json` exists ("no package.json here; to create a project: jss-devtools init <name>")
   and parses (the parse error).
2. No `workspaces` field and no `pnpm-workspace.yaml` ("monorepos are not supported yet").
3. `./tsconfig.json` exists (22a).
4. `.git` exists in this folder, file or directory; else, by `gitTopLevel`, either "not a git
   repository; run git init first" or "the git root is ../..; run jss-devtools init there" (18a).
5. `core.hooksPath` is unset, `.husky/_` or `.husky` (19a).
6. `detectPackageManager` gives npm, yarn (classic), pnpm (7+) or bun; `null` means npm; anything
   else exits 1 "<name> is not supported; supported: npm, yarn 1, pnpm, bun". Its `--version`
   answers.
7. The owned files and every other config name in the config-name table are absent, or `-f`. Without
   `-f`: one exit 1 listing all of them, with "to replace them: jss-devtools init --force", plus
   "--no-vscode" when `.vscode/` is in the list.

## The plan

`init.service.ts` returns a plan, data only: each entry is `create`, `update` (merge) or `delete`
with its path and new content. Shared files merge as the decision log says: `package.json` adds
scripts, devDependencies, `lint-staged` and `packageManager` only when absent, and with `-f` removes
the `prettier` and `commitlint` keys; `.gitignore` and `.prettierignore` append missing lines; a hook
adds its line once and keeps the user's lines. An `update` that changes nothing is dropped.

`--dry-run` renders the plan (`+` create, `~` update, `-` delete) and exits 0. It runs the same
preflight, so a failed check still exits 1.

## Files to Create / Modify

Create: `src/commands/init/init.service.ts` and, if it passes 200 lines, `*.service.ts` siblings by
concern (preflight, merge); `src/commands/init/types/*.type.ts` for the plan and the mode;
`tests/init.service.test.ts` and siblings. Modify: `src/commands/init/types/init-options.type.ts`.

## Verification

One test per row of each table above, in temp folders, asserting the message and an unchanged folder
(compared before and after, not assumed).

## Tasks & Steps

- [x] Argument rules: unsupported framework, `--pm` without `<dir>`, `-f` with `<dir>`
- [x] Create-mode preflight, three checks in order
- [x] Existing-mode preflight, seven checks in order
- [x] Plan computation, with the shared-file merges and the `-f` deletions
- [x] `--dry-run` rendering and exit 0
- [x] One test per table row, asserting the message and a byte-for-byte unchanged folder
- [x] Run the full gate; commit
