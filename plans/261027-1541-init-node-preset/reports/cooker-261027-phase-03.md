# Cooker report — Phase 3: Arguments, preflight and the plan

Date: 2026-10-27. Working copy synced via Mutagen; nothing committed, nothing pushed, no `git init`
in the project root. No new dependency.

## Files changed

Created:

- `src/commands/init/init.service.ts` — `validateInitArguments` (the three argument rules) and `resolveInitMode`
- `src/commands/init/preflight.service.ts` — `preflightInit(cwd, positional, options)`: dispatches to the
  create-mode preflight (3 checks in order) or the existing-mode preflight (7 checks in order), stops at the
  first failure, returns the `InitPreflight` data (pm, pmVersion, existing package.json raw+parsed)
- `src/commands/init/merge.service.ts` — `mergePackageJson`, `mergeLines` (ignore files), `mergeHook` (husky hooks)
- `src/commands/init/plan.service.ts` — `buildInitPlan` (create and existing modes), `renderPlan` (`+ ~ -` string)
- `src/commands/init/types/init-plan.type.ts` — `InitMode`, `PlanEntry`, `InitPlan`, `InitPreflight`
- `tests/init.service.test.ts`, `tests/init-preflight.service.test.ts`, `tests/init-plan.service.test.ts`
- `tests/support/fs-snapshot.ts` — `snapshotDir`, a recursive path+content snapshot used to assert the folder
  is unchanged before/after every failing case

Modified:

- `src/commands/init/types/init-options.type.ts` — added `pm`, `force`, `framework`, `noVscode`; added
  `InitFramework`
- `src/commands/init/templates/package-json.template.ts` — extracted and exported `RUN_COMMAND`,
  `SHARED_SCRIPTS`, `formatScript` and `LINT_STAGED` from the manifest literal so the existing-mode merge
  reuses the same facts instead of a second copy (one fact, one home). Template output is byte-identical;
  the 26 phase-2 snapshots pass unchanged.
- `plans/261027-1541-init-node-preset/phase-03-arguments-preflight-and-plan.md` — status completed, tasks
  ticked except the commit line

## Small decisions made here, and why

- **`preflightInit` takes `cwd` as a parameter**, not `process.cwd()`. Existing mode reads files relative to
  it; the command (phase 4) passes `process.cwd()`. This makes the seven checks testable in temp folders.
- **Unsupported detected manager is named by the detector's `agent`**, so the messages are exactly
  "yarn@berry is not supported; …", "pnpm@6 is not supported; …", "deno is not supported; …". Phase 3 says
  "agent yarn@berry, pnpm@6, deno → exit 1 `<name> is not supported…`", and the plain `name` ("yarn") would
  read as contradicting the supported list. A supported manager is any detect result whose agent is
  `npm`, `pnpm`, `bun` or `yarn`; `null` detection means npm.
- **Existing-mode missing-manager message is "<pm> is not installed; install it"** — the create-mode text
  "or pick another with --pm" contradicts existing mode, where `--pm` exits 1. Plan gap; flagged, not
  copied blindly.
- **Conflict message ends with "; or pass --no-vscode"** when a `.vscode/` file is in the list. The decision
  log says it "also offers --no-vscode" without fixing the wording; this is the shortest phrasing that
  keeps the `--force` sentence intact.
- **`-f` with `<dir>` message**: "-f, --force only applies when setting up an existing project; a new
  project has nothing to replace" — worded like the `--pm` row (flag; when it applies; why not here), per
  the phase table, which fixes no exact text.
- **The `format` script of an existing repository follows the detected manager** (`pnpm lint:fix && …`,
  `npm run lint:fix && …`, …) via the shared `RUN_COMMAND` map, same rule as create mode.
- **The `delete` entries with `-f` carry no content**; every `create`/`update` entry carries the full new
  content, so phase 4 can render and write without re-reading.
- **Test PATH stubs replace `PATH` entirely** (a bare stub dir) rather than prepending, because prepending
  still finds the real git — that is the one place a helper needed a trap comment.
- **`.prettierignore` present but empty merges as `update`, not `create`** — the file exists; `mergeLines`
  appends every template line. Same for a `.gitignore` that already has some lines.

## Gate output (real)

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` — all green:

- `pnpm lint`: clean
- `pnpm typecheck` (`tsc --noEmit`): clean
- `pnpm test`: `Test Files  18 passed (18)` / `Tests  190 passed (190)` (151 before this phase; +39)
- `pnpm build`: `dist/cli.mjs  119.67 kB │ gzip: 29.86 kB`, `✔ Build complete`

Bundle size: unchanged at 119.67 kB — nothing in `cli.ts` imports the new services yet; they join the
bundle in phase 4 when the command wires them.

## What the plan did not say

- Plan order note: the argument table's first two rows (unknown flag, `--framework` choices error) are
  commander registration and belong to phase 4; only the three service-side rows are implemented here.
- `packageManagerVersion` runs in the project's folder before create mode makes it, so the
  `packageManager` field records the run-time version per decision 17a.
- The existing-mode conflict check treats every name in the config-name table plus `.editorconfig` and the
  two `.vscode/` files as "already there", deduplicated; with `--no-vscode` the `.vscode/` files leave the
  list and the plan, so they are no longer owned files.
- A failing `--pm` version check in create mode exits before the folder is created (the check runs on the
  current folder), per decision 17a.

## Unresolved questions

- None blocking. The three wording decisions above (existing-mode missing manager, `--no-vscode` suffix,
  `-f`-with-dir) are the ones I would most like the planner to confirm before commit.

## Review fixes (2026-10-27, planner review round 2)

The three wording questions were accepted and recorded in the decision log ("Wording the planner
settled at the phase 3 review"). Applied:

1. **`mergePackageJson` tracks real changes, not re-serialization equality.** It now sets a `changed`
   flag when a script, devDependency, the `lint-staged` key, the `packageManager` field is added or a
   `-f` key is removed, and returns `null` when nothing was. A package.json indented with 2 spaces that
   already holds the full set no longer plans `~ package.json`. The test for this now serializes with
   two spaces on purpose. `mergePackageJson` lost its unused `raw` parameter, and `InitPreflight`
   dropped the now-unread `packageJson.raw` field.
2. **`packageJsonKeys` joins the conflict list and drives the `-f` deletions.** Preflight lists a present
   `prettier` or `commitlint` key as `package.json "prettier" key` in the same exit 1 list, after the
   files; `mergePackageJson` reads the key names from `CONFIG_NAMES` instead of hard-coding them.
3. **`.prettierrc.toml` added** to `CONFIG_NAMES.prettier.files` in the decision log's order (after
   `.prettierrc.cts`) and covered in the conflict-list test.

Gate after the fixes, real output:

- `pnpm lint`: clean
- `pnpm typecheck` (`tsc --noEmit`): clean
- `pnpm test`: `Test Files  18 passed (18)` / `Tests  191 passed (191)`
- `pnpm build`: `dist/cli.mjs  119.67 kB │ gzip: 29.86 kB`, `✔ Build complete`; bundle unchanged

## Review fix round 3 (2026-10-27, Mac gate, Node 24.11.0)

**Product bug in the git-root message.** `git rev-parse --show-toplevel` prints the resolved path while
`cwd` can sit behind a symlink (`/var` → `/private/var` on macOS, or a symlinked project folder), so
`relative(cwd, top)` mixed the two and produced an absolute garbage path in the message. Fixed in
`preflight.service.ts`: `relative(realpathSync(cwd), top)`, with a one-line comment naming the trap.
New test runs the check through a `symlinkSync` link to the project subfolder and expects the same
"the git root is ..; run jss-devtools init there", so the VPS covers the symlink case too.

Gate after the fix, real output:

- `pnpm lint`: clean
- `pnpm typecheck` (`tsc --noEmit`): clean
- `pnpm test`: `Test Files  18 passed (18)` / `Tests  192 passed (192)`
- `pnpm build`: `dist/cli.mjs  119.67 kB │ gzip: 29.86 kB`, `✔ Build complete`; bundle unchanged
