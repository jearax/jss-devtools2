# Cooker report — Phase 5: End-to-end test, decision record and docs

Date: 2026-10-27. Working copy synced via Mutagen; nothing committed, nothing pushed (the planner
reviews and commits). No new dependency. Node on this machine is 24.21.0 (above the 24.11.0 floor;
the gate runs green on it, CI keeps the exact floor). pnpm 11.24.0. This machine has npm and pnpm
but no yarn or bun, so those two e2e rows report skipped here; the planner reruns the suite on the
Mac, which has all four.

## Fixes before the end-to-end test (all three, each with tests)

1. **`esbuild: true` in the template.** `pnpmWorkspaceYamlTemplate` now lists `esbuild` first under
   `allowBuilds` (snapshot updated). Without it, pnpm 11 fails every install and `pnpm exec` with
   `ERR_PNPM_IGNORED_BUILDS`, decided 2026-10-27 ("Do dùng tsx, nên cho allowBuilds esbuild: true").
2. **Monorepo by `packages`.** `preflightExisting` now reads the file and throws "monorepos are not
   supported yet" only when it has a top-level `packages` field (`isMonorepoWorkspace`). A single
   package's `pnpm-workspace.yaml` — what pnpm 11 writes on its own — passes. New test accepts it;
   the existing `packages:` row still exits 1.
3. **Existing-mode `pnpm-workspace.yaml` merge, allowBuilds entries only.** Per the planner's
   correction of the decision log ("Existing mode with pnpm", user chose "Không thêm"):
   existing mode creates the file when absent with just the two `allowBuilds` entries
   (`pnpmWorkspaceYamlExistingTemplate`, no `strictPeerDependencies`, no `engineStrict`) and
   otherwise adds each missing `allowBuilds.esbuild` / `allowBuilds.unrs-resolver`, user values
   kept (`false` included). A new line-based `mergePnpmWorkspaceYaml` in `merge.service.ts` returns
   `merged` / `unchanged` / `unmergeable`; preflight runs it for pnpm and exits 1 with
   "pnpm-workspace.yaml cannot be extended line by line; add these entries by hand:
   allowBuilds.esbuild: true, allowBuilds.unrs-resolver: true" on flow style. No YAML dependency —
   the line-based merge is deterministic for the template layout and pure appends otherwise.

Files touched: `src/commands/init/templates/pnpm-workspace-yaml.template.ts`,
`src/commands/init/merge.service.ts`, `src/commands/init/preflight.service.ts`,
`src/commands/init/plan.service.ts`; tests in `tests/init-preflight.service.test.ts` (2 new) and
`tests/init-plan.service.test.ts` (6 new, including pure merge cases); the workspace template
snapshot updated.

## End-to-end test

`tests/init.e2e.test.ts`, running the built `dist/cli.mjs` as a user would:

- One test per manager (`it.each` over npm, pnpm, yarn, bun): `init my-app-<pm> --pm <pm> -y` in a
  temp folder, exit 0; then `<pm> run lint`, `<pm> run typecheck`, `<pm> run build`, then
  `node dist/main.js` printing exactly the line `src/main.ts` logs. npm and pnpm are required
  (missing → the test fails); yarn 1 and bun print "[init e2e] <pm>: skipped, not on PATH" and
  return when absent.
- Also asserts: `git config core.hooksPath` is `.husky/_`; branch is `main`;
  `packageManager` is `<pm>@…`; replaying the decided two-bin sort
  (`prettier-package-json --write` then `prettier --write` from the project's own local bins)
  leaves `package.json` byte for byte unchanged; and the files present are exactly the decided
  list (plus `.husky/_`, which husky fills on install, and the manager's lockfile — neither is
  init's writing).
- Existing mode: copies the pnpm project, deletes the owned files, `init -y` exits 0 and the
  workspace file carries both `allowBuilds` entries; a second `init -y` exits 1 with "already
  exist" and changes nothing; `init -f -y` exits 0.

**Gating:** the file is `describe.runIf(process.env.INIT_E2E === '1')`, so the default `pnpm test`
reports `1 skipped` file / `5 skipped` tests and stays fast and offline. It runs alone with
`INIT_E2E=1 pnpm vitest run tests/init.e2e.test.ts` (the vitest globalSetup builds the bundle
first). It needs the network for the installs, which no other suite here does, and it would add
minutes and a manager-availability dependency to every gate run.

**Measured on this machine** (last green runs): npm 22.6s, pnpm 7.6s, yarn and bun skipped; whole
suite 42.6s wall (44.4s including pnpm overhead). Results green: `Tests 5 passed (5)`.

## Decision record and docs

- `docs/decisions/0030-init-node-preset.md` — the decided flow (modes by syntax, the edge-case
  strategy, the preset file list, the module setup and 6c, shared vs owned merge, preflight order,
  the two questions, the pinned version table), with the user's quotes verbatim, pointing to the
  decision log for the full history.
- `README.md` — the init paragraph in the install section now describes create and existing mode
  instead of "the scaffold writes nothing yet"; the command examples gained `init my-app`; the
  intro no longer calls the repo "at its foundation stage".
- `docs/system-architecture.md` — the init section rewritten around the service pipeline, the
  preflight order, the shared-file merges and the full flag table; the source tree lists the init
  services, constants and templates; the test-strategy table names the init suites and states the
  `INIT_E2E=1` gating.
- `docs/codebase-summary.md` — the init folder, `scripts/pin-node-preset.mjs`, and the seven init
  test suites from phases 1–5 (the docs had not caught up since phase 1).
- `docs/project-roadmap.md` — new "Done: the init node preset" section; the "Not started"
  toolchain row now reads "Framework presets beyond `node`".
- `docs/decisions/0029` — its consequence line still said every `init` run ends "Nothing to set
  up", retired by this plan; replaced with a pointer to 0030. One stale-line purge, flagged here.
- `docs/code-standards.md` — no change needed: the two command-owned roles joined the suffix table
  in phase 1.
- Plan closed: `plan.md` status `done` with the outcome and the four things the plan did not say
  (e2e gating, the two-bin sort replay, the `.husky/_` and lockfile exclusions, the 0029 purge).
  `phase-05-…md` status `completed`, every box ticked except the commit.
- Journal: `plans/journals/2026-10-27-cooked-the-init-node-preset.md`, one file for the whole plan.

## Verification (real)

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` — exit 0:

- `pnpm lint` (ESLint, Prettier as a rule): clean
- `pnpm typecheck` (`tsc --noEmit`): clean
- `pnpm test`: `Test Files  19 passed | 1 skipped (20)` / `Tests  209 passed | 5 skipped (214)`
  (201 before; the skipped file is `tests/init.e2e.test.ts`, gated)
- `pnpm build`: `dist/cli.mjs  192.63 kB │ gzip: 49.13 kB`, `✔ Build complete`

Bundle size: phase 4 ended at 190.16 kB; the first build on this machine carrying the phase 5
source fixes is 192623 bytes, the final build 192630 bytes (+7, the `key ?? …` guard in the
workspace merge). The ~2.5 kB over phase 4 is the phase 5 source itself: the `esbuild: true`
template line, the existing-mode template export, and the line-based merge plus the two preflight
checks.

End-to-end, gated run: `Tests 5 passed (5)`, npm 22.6s, pnpm 7.6s, yarn/bun skipped, suite 42.6s.

## What the plan did not say

- The e2e `available()` probe runs `<pm> --version` once per manager; a manager that exists but
  cannot run (broken install) counts as missing, so a required-manager failure names it clearly.
- The existing-mode e2e copies the pnpm project specifically, so the workspace-file assertions run
  on every machine that has pnpm (required), not only on the Mac.
- The second-run "already exist" check compares `eslint.config.mjs` bytes before and after, proving
  nothing was rewritten, since the file list alone could not.

## Concerns

- The e2e has run on npm and pnpm only so far. yarn 1 and bun need the Mac rerun; the template's
  yarn hook line (`yarn exec commitlint -- --edit "$1"`) is snapshot-tested but never executed here.
- The unmergeable-workspace message names both `allowBuilds` entries even when one may already be
  inside the flow-style mapping; line-based reading cannot tell. The decision log fixes no wording.
- `docs/code-standards.md` still documents this repo's own `pnpm-workspace.yaml` (no `esbuild`
  entry) and the generated preset's side by side; the repo's own file keeps its shape because this
  repo does not install tsx. No change made; noting in case the planner wants a sentence there.

## Review fixes (2026-10-27, planner review, Mac e2e all green in 82s)

1. **`mergePnpmWorkspaceYaml` took the child indent.** It hard-coded 2 spaces, so a file indented
   with 4 merged to mixed indentation — not valid YAML. The indent now comes from the first
   existing child under `allowBuilds`; 2 spaces only when the block has no child yet.
2. **pnpm's placeholders are replaced, not kept.** After a failed install pnpm writes
   `esbuild: set this to true or false`; the merge counted that as a user value and kept it, so the
   next install failed again. A value that is neither `true` nor `false` is pnpm's prompt, not the
   user's choice: the line is rewritten to `<name>: true`, keeping its own indent. Tested for both
   `esbuild` and `unrs-resolver` (including one placeholder plus one absent entry, and a `false`
   the user actually set, which stays).
3. **The existing-mode e2e no longer passes vacuously.** When `my-app-pnpm` is missing it logged
   and returned, so the test passed while checking nothing, although pnpm is required. It now
   asserts the folder exists and fails otherwise.
4. **The "only the install can fail after writes" claim corrected** in `README.md`,
   `docs/decisions/0030` and the plan's Outcome: after the writes, `git init` (create mode), the
   install and the `package.json` sort can each still exit 1. `docs/system-architecture.md` makes
   no such claim; nothing to change there.

Gate after the fixes, real output — `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, exit 0:

- `pnpm lint`: clean; `pnpm typecheck`: clean
- `pnpm test`: `Test Files  19 passed | 1 skipped (20)` / `Tests  213 passed | 5 skipped (218)`
  (209 before the fixes; +4 merge tests)
- `pnpm build`: `dist/cli.mjs  193.16 kB │ gzip: …`, `✔ Build complete`; bundle 192630 → 193160
  bytes (+530, the indent-aware and placeholder-aware merge)

End-to-end rerun on this machine: `Tests 5 passed (5)`, npm 33.8s, pnpm 9.1s, yarn/bun skipped,
suite 56.6s (npm's share is registry variance; the Mac rerun with all four managers is the planner's
82s run, which predates these four fixes and should be rerun once more at commit).

## Status

Status: DONE
Summary: All three pnpm-11 fixes plus the four review fixes (indent-aware and placeholder-aware
workspace merge, non-vacuous existing-mode e2e, corrected failure claim); the gated end-to-end
suite green for npm and pnpm (yarn/bun skipped, absent here); decision record 0030, the doc
surfaces, the closed plan and the journal written; full gate green, bundle 193160 bytes.
Concerns: The Mac's 82s e2e run predates these four fixes; rerun the suite there once more at
commit. Wording of the unmergeable workspace message is the closest reading of the decision log.
