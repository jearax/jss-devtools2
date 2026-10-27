---
title: "init: the node preset, create and existing modes"
description: "Fill the shipped init scaffold with the decided flow: init <dir> creates a TypeScript node project, init sets up the current one, both with ESLint, Prettier, EditorConfig, husky, lint-staged, commitlint and VS Code settings, versions pinned in the CLI."
status: done
priority: P1
effort: 3d
branch: main
tags: [init, cli, preset]
blockedBy: []
blocks: []
created: 2026-10-27
---

# init: the node preset

## Outcome

`jss-devtools init my-app` creates a folder holding a TypeScript node project that installs, lints,
typechecks, builds and runs (`node dist/main.js`), with git hooks active. `jss-devtools init` in an
existing TypeScript repository adds the same toolchain, or stops with exit 1 and the next step. Every
check runs before the first write; after it, `git init`, the install and the `package.json` sort
can each still exit 1, and nothing is rolled back.

## Input

Every behavior here was decided with the user, quoted, in
[the init flow decision log](../261022-0141-init-flow-discussion/decision-log.md). Read it first; this
plan does not restate the reasons. The flow is drawn in
[init-flow.html](../261022-0141-init-flow-discussion/init-flow.html).

## Phases

| # | Phase | Depends on |
|---|---|---|
| 1 | [Roles, adapters and dependencies](./phase-01-roles-adapters-and-dependencies.md) | none |
| 2 | [Preset contents and the version table](./phase-02-preset-contents-and-versions.md) | 1 |
| 3 | [Arguments, preflight and the plan](./phase-03-arguments-preflight-and-plan.md) | 1, 2 |
| 4 | [Confirmation, writes, install and help](./phase-04-confirm-write-install-and-help.md) | 3 |
| 5 | [End-to-end test, decision record and docs](./phase-05-end-to-end-test-and-docs.md) | 4 |

One commit per phase, conventional, on `main`. The first commit, before any code, holds this plan,
the decision log, `init-flow.diagram.json`, `init-flow.html` and the `open-questions.md` update.

## Acceptance

- In an empty temp folder, `init my-app --pm <pm> -y` for each of npm, pnpm, yarn 1 and bun that is
  installed on the machine: exit 0; then inside `my-app`, `lint`, `typecheck` and `build` pass and
  `node dist/main.js` prints its line; `git config core.hooksPath` is `.husky/_`; `git log` is empty
  and the branch is `main`.
- Every exit 1 row in the decision log has a test that asserts the message and that the folder is
  byte for byte unchanged (or, in create mode, not created).
- `init --dry-run` and `init my-app --dry-run` write nothing, install nothing, exit 0, and list `+`,
  `~` and `-` entries.
- `jss-devtools init --help` renders the block in phase 4 exactly.
- Architecture rules green, including the new roles from phase 1, each with its negative fixture.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green on Node 24.11.0, real output
  reported.

## Non-goals

- Frameworks other than `node`: listed in `--framework`, exit 1 when chosen.
- `--harness` (announced by the user for later), `--json`, `--cwd`, `--import-alias`, `--no-install`,
  `--no-linter`, `--no-commitlint`, a manifest, monorepos.
- Editing `tsconfig.json`, the alias, or `dev`/`build` scripts of an existing repository.
- Rollback after a failed install.

## Constraints

- Layout and rules of decision 0024; `@/` imports without extensions (0025, 0028); exit codes 0 and
  1 only (0023); shared flags declared once in core (0029).
- Zero comments unless a line hides a trap the code cannot show.
- Prose in English, user quotes verbatim.
- No `Co-Authored-By` line, no AI reference in commits. Do not push: a push to `main` deploys.
- Pin what you install: the two new runtime dependencies are exact versions.

## Risks

| Risk | Mitigation |
|---|---|
| tsc-alias misses an import, so `dist/` fails only at run time (accepted with 6c) | the end-to-end test runs `node dist/main.js`; the ESLint rule against extensions and `../*` ships in the preset |
| A pinned version newer than one day breaks a pnpm user's first install | phase 2 pins only versions older than `minimumReleaseAge` (1440 minutes) |
| yarn 1 or bun is missing on CI, so its row of the end-to-end test is skipped | the test reports which managers ran; npm and pnpm are required |
| `.editorconfig` exists in most repositories, so existing mode often needs `-f` | accepted with decision 11; the message names `-f` |

## Unresolved questions

- The preset's file contents are provisional (25a): the user reviews the phase 2 table at commit.
- None blocking phase 1: the two new roles were approved on 2026-10-27.

## Outcome

Done on 2026-10-27, cooked on Linux (Node 24.21.0, pnpm 11.24.0; no yarn or bun on this machine, so
their end-to-end rows report skipped here and the planner reruns the suite on the Mac, which has all
four). `init <dir>` creates a TypeScript node project that installs, lints, typechecks, builds and
runs, with git hooks on `main`; `init` sets up an existing repository, merges the shared files, and
stops on the owned-file list without `-f`. Every check runs before the first write.

Three fixes joined phase 5, all found by running the phase 4 bundle with pnpm 11.24.0 and decided
on 2026-10-27: `esbuild: true` in the `pnpm-workspace.yaml` template, the monorepo check keyed on
the file's top-level `packages` field, and the existing-mode `pnpm-workspace.yaml` merge (allowBuilds
entries only; the planner corrected an early reading that also added `strictPeerDependencies` and
`engineStrict` there — existing mode never does).

Four things the plan did not say. The end-to-end suite is gated behind `INIT_E2E=1` and run alone
(`INIT_E2E=1 pnpm vitest run tests/init.e2e.test.ts`), because it installs from the registry and
needs every manager on `PATH`; the default `pnpm test` reports it skipped, keeping the gate fast and
offline. The sorted-`package.json` check replays the decided two-bin order (`prettier-package-json`
then `prettier`), because either bin alone rewrites the other's bytes and would always differ. The
"files present are exactly the decided list" check excludes `.husky/_`, which husky itself fills on
install, and the manager's lockfile, which neither is init's writing. And `docs/decisions/0029`
lost its stale "Nothing to set up" consequence line, retired by this plan.
