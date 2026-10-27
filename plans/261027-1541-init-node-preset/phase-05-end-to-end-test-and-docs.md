---
phase: 5
title: "End-to-end test, decision record and docs"
status: completed
priority: P1
effort: "5h"
dependencies: [4]
---

# Phase 5: End-to-end test, decision record and docs

## Goal

Prove a generated project installs, lints, typechecks, builds and runs with each package manager, then record the decision and update the docs.

## Fixes before the end-to-end test

Found by running the phase 4 bundle with pnpm 11.24.0, decided 2026-10-27 (decision log, "Existing
mode with pnpm" and the `pnpm-workspace.yaml` row):

1. The `pnpm-workspace.yaml` template adds `esbuild: true` under `allowBuilds`.
2. Existing-mode preflight treats `pnpm-workspace.yaml` as a monorepo only when it has a top-level
   `packages` field.
3. Existing mode with pnpm merges `pnpm-workspace.yaml` as a shared file: created when absent with
   `allowBuilds` holding `esbuild: true` and `unrs-resolver: true`, otherwise each missing entry
   added, user values kept. It never adds `strictPeerDependencies` or `engineStrict` (create mode
   only). A file whose `allowBuilds` cannot be extended line by line (flow style, for example) stops
   in preflight with exit 1, naming the entries to add by hand. No YAML dependency unless line-based
   merging proves wrong.

## End-to-end test

`tests/init.e2e.test.ts`, running the built bundle as a user would:

1. For each package manager on `PATH` (npm and pnpm required; yarn 1 and bun reported as skipped when
   missing): `init my-app --pm <pm> -y` in a temp folder, exit 0.
2. Inside `my-app`: `<pm> run lint`, `<pm> run typecheck`, `<pm> run build`, then `node dist/main.js`
   prints its line. This is the check that the pinned set "fits" (decision 14) and that tsc-alias
   rewrote every import (6c).
3. `git config core.hooksPath` is `.husky/_`; the branch is `main`; `package.json` keys are sorted.
4. Existing mode: copy the created project, delete the owned files, run `init -y`, expect exit 0;
   run it again, expect exit 1 with the "already exist" list; run `init -f -y`, expect exit 0.

It needs the network for the installs. Keep it in its own file so it can be run alone, and say in
the report how long it took.

## Decision record

`docs/decisions/0030-init-node-preset.md`: the init flow decided on 2026-10-22 and 2026-10-27, with the
user's quotes, pointing to the decision log for the full record. The log stays as the discussion
history; the record is what an agent reads.

## Docs

Update where `init` is described: `README.md` (what the CLI does, the install section's `init`
paragraph, which says it writes nothing), `docs/codebase-summary.md`, `docs/system-architecture.md`,
`docs/project-roadmap.md`, `docs/code-standards.md` (roles, if not done in phase 1). Close the plan
with the outcome and what the plan did not say, as the scaffold plan did, and add a journal.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` on Node 24.11.0, the full output in the
report, the bundle size before and after.

## Tasks & Steps

- [x] Fixes before the end-to-end test: template `esbuild`, monorepo by `packages`, existing-mode `pnpm-workspace.yaml` merge, each with tests
- [x] `tests/init.e2e.test.ts`: create with each manager on `PATH` (npm and pnpm required), then lint, typecheck, build, `node dist/main.js`
- [x] Assert hooks path `.husky/_`, branch `main`, sorted `package.json`, and that the files present are exactly the decided list
- [x] Existing mode: set up, rerun (exit 1 list), rerun with `-f` (exit 0)
- [x] Write `docs/decisions/0030-init-node-preset.md`
- [x] Update `README.md`, `docs/codebase-summary.md`, `docs/system-architecture.md`, `docs/project-roadmap.md`
- [x] Close the plan with its outcome; add a journal
- [x] Run the full gate on Node 24.11.0; report output, e2e duration and bundle size
- [x] commit (the planner commits)
