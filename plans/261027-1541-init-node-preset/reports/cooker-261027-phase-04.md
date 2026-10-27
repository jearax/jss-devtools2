# Cooker report — Phase 4: Confirmation, writes, install and help

Date: 2026-10-27. Working copy synced via Mutagen; nothing committed, nothing pushed. No new
dependency. Node 24.21.0, pnpm 11.24.0.

## Files changed

Created:

- `src/commands/init/write.service.ts` — `applyInitPlan(plan)`: in create mode `mkdir -p` the target
  then `gitInit` (a `false` result exits 1 with "git init failed"), then every create/update entry
  (parent folders made on the way), then the deletions last, so `-f` never deletes before its
  replacement is on disk
- nothing else: the select prompt and the plan rendering are not shared, so per the phase file they
  stay in `init.command.ts` (141 lines) and no `*.ui.ts` was created

Modified:

- `src/commands/init/init.command.ts` — full flow: `validateInitArguments` → no-terminal guard →
  package-manager select → `preflightInit` → `buildInitPlan` → plan rendered through `log.message` →
  dry-run outro or `confirm` → `applyInitPlan` → `installPackages` (inherited stdio) →
  `runLocalBin(pm, 'prettier-package-json', …)` then `runLocalBin(pm, 'prettier', …)` → outro.
  Options registered: `[dir]` argument, `--framework` (commander `choices` + default `node`),
  `--pm` (choices, no default — absence triggers the question), `-f, --force`, `--no-vscode`, and the
  two `COMMON_OPTIONS`. Examples block copied byte for byte from the phase file
- `src/core/constants/common-option.constant.ts` — both descriptions gained their defaults, per the
  phase note that `doctor` attaches neither
- `src/commands/init/types/init-options.type.ts` — `noVscode` widened from `true` to `boolean`
  (commander's `--no-vscode` pairs into a real default)
- `tests/init.command.test.ts` — rewritten for the real command: help byte-for-byte, the no-terminal,
  declined and both install-failure exits in temp folders, the create-mode select path, the
  argument-rule rows, the framework rejection, the misspelled-flag suggestion, and the doctor row
- `tests/bundle.test.ts` — init help block replaced with the phase 4 block; the old "sets nothing up"
  happy path replaced with the piped-output refusal (`init` in an empty folder now exits 1 with
  "run it in a terminal, or pass --yes" and leaves the folder untouched)
- `plans/…/phase-04-confirm-write-install-and-help.md` — status completed, all boxes ticked except
  the commit line, which stays unchecked (the planner commits)

## Small decisions made here, and why

- **Commander 15.0.0 enforces `Option.choices()` at parse time** (planner-corrected, see the review
  section below): an unknown value such as `vue` exits 1 with "argument 'vue' is invalid. Allowed
  choices are …". A value inside the choices but outside what init supports, such as `react`, passes
  the parse and exits 1 through `validateInitArguments` with the decision-log message "react is not
  supported yet; only node is". Both rows are tested.
- **Install-failure tests set `npm_config_fetch_retries=0`** alongside the dead registry. Measured on
  this machine: with defaults, npm's per-package backoff took 3m30s to fail three devDependencies —
  over the timeout. With retries 0, connection refused fails in ~0.5s. The phase only prescribes
  `npm_config_registry=http://127.0.0.1:9`; the extra env shortens the wait without changing the
  outcome (exit 1, files kept).
- **Question order: the package-manager select runs before preflight.** The plan depends on the pm
  (scripts, hooks, `packageManager`), and preflight needs the pm for the version check, so asking
  first lets both use one value; nothing is written before the confirmation either way.
- **Dry-run without `--pm` builds the plan for npm** — the select is skipped (nothing is asked in dry
  run) and npm is the `-y` default. So `init my-app --dry-run` previews the npm variant.
- **Wording the plan and the decision log leave open** (closest reading, listed under Concerns):
  outro in create mode is `next: cd <name>, <pm> run dev`; existing mode outro is `done`; the select
  message is `package manager`; a failed `gitInit` exits 1 with `git init failed`.
- **Sort failures are swallowed**: `runLocalBin` results are not checked, because after a successful
  install an unsorted `package.json` is not worth an exit; decision 20c only requires the order.

## Verification (real)

- `init --help` from the built bundle equals the phase block byte for byte — asserted in both
  `tests/init.command.test.ts` and `tests/bundle.test.ts` (`expect(stdout).toBe(BLOCK)`), green.
- The no-terminal exit, the declined confirmation (folder snapshotted unchanged via
  `tests/support/fs-snapshot`), the existing-mode install failure (dead registry, asserting
  `eslint.config.mjs`, `.prettierrc.json`, `.husky/pre-commit`, `.vscode/settings.json` are kept) and
  the create-mode install failure (asserting `my-app/.git`, `src/main.ts`, `eslint.config.mjs` are
  kept) — all green.

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` — exit 0:

- `pnpm lint`: clean after one `pnpm format` round (autofix ordering/blank-line rules on the new files)
- `pnpm typecheck` (`tsc --noEmit`): clean
- `pnpm test`: `Test Files  18 passed (18)` / `Tests  196 passed (196)` (192 before; the four
  "Nothing to set up" stub runs are gone, eleven real-command tests in). The `npm error` lines in the
  log are the inherited stderr of the two install-failure tests, expected by design
- `pnpm build`: `dist/cli.mjs  189.70 kB │ gzip: 48.39 kB`, `✔ Build complete`. Up from 119.67 kB:
  the templates, plan/merge/preflight services and the command join the bundle in this phase, as the
  phase 3 report predicted

## Concerns

- The open wordings above (outro texts, select message) — none is fixed by the decision log; all are
  the shortest phrasing that keeps the decided content. The planner accepted them at review.
- Outro text in create mode names the two next steps in one line; the phase says "the next steps,
  `cd my-app` and `<pm> run dev`", not the exact rendering.

## Review fixes (2026-10-27, planner review)

Five blocking findings from running the built bundle; the unit tests missed them because they fed
hand-built options into the services instead of parsing through commander. All fixed:

1. **`-y` now skips the final confirm.** The confirmation was awaited unconditionally; with `-y` the
   answer is the default (yes), so the question is only asked when `options.yes !== true`. The
   planner's repro (`init -y` with `packageManager: pnpm@11.24.0` on a non-TTY stdin) hung in the
   clack prompt and died with exit 13; the wiring test now asserts zero prompts and that the install
   is reached.
2. **Existing mode installs and sorts with the detected manager.** `askPackageManager` returned npm
   whenever there was no `<dir>`; it now returns `undefined` for existing mode, nothing is injected
   into the options, and install, sort and outro all read `preflight.pm`.
3. **`--no-vscode` works.** Commander maps the negated flag to `options.vscode === false` (default
   `true`); the code read a `noVscode` field that commander never produces. `InitOptions` now carries
   `vscode?: boolean`, and preflight and plan read `options.vscode !== false` / `=== false`.
4. **A failing sort exits 1.** `sortPackageJson` now checks both `runLocalBin` codes; a failure exits
   1 with "`<bin>` failed; the files are written. To finish: `<pm> exec <bin> --write package.json`"
   (prefixed with `cd <name> && ` in create mode), nothing rolled back — same shape as the
   install-failure message.
5. **`git init` failure names the folder and the next step**: "git init failed in my-app; run git
   init there to see why".

Tests added, all parsing through the real commander program (new
`tests/init-command-wiring.test.ts`, adapter mocked to record what actually ran): `-y` with no TTY
reaches the install without prompting and calls `installPackages('pnpm', dir)`; a successful install
sorts with `runLocalBin('pnpm', 'prettier-package-json' | 'prettier')`; a failing sort exits 1
naming the bin; `--no-vscode` keeps `.vscode/` out of the plan and of the folder. Plus, in
`tests/init.command.test.ts`: `--framework vue` exits 1 with commander's "argument 'vue' is invalid.
Allowed choices are …". Corrected my earlier claim: commander 15.0.0 does enforce `choices()`; the
first probe was flawed (the subcommand was parsed directly, so the option never went through the
program's parse), and `react` exits through `validateInitArguments` because it is a valid choice.

Gate after the fixes, real output — `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, exit 0:

- `pnpm lint`: clean
- `pnpm typecheck` (`tsc --noEmit`): clean
- `pnpm test`: `Test Files  19 passed (19)` / `Tests  201 passed (201)`
- `pnpm build`: `dist/cli.mjs  190.16 kB │ gzip: 48.52 kB`, `✔ Build complete`

## Review fix round 2 (2026-10-27, Mac gate, Node 24.11.0)

One test-side failure only. The wiring test compared `calls.install` against the `mkdtemp` path, but
after `process.chdir(dir)` the command reads `process.cwd()`, which macOS resolves (`/var` →
`/private/var`), so the recorded cwd was `/private/var/folders/...`. The assertion now compares
against `realpathSync(dir)`, with a one-line comment naming the trap (the same one phase 3 hit in
the git-root message). The other path assertions in the file use `existsSync`, which does not care.
The fix is test-side only; no source change.

Gate after the fix, real output — `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, exit 0:

- `pnpm lint`: clean
- `pnpm typecheck` (`tsc --noEmit`): clean
- `pnpm test`: `Test Files  19 passed (19)` / `Tests  201 passed (201)`
- `pnpm build`: `dist/cli.mjs  190.16 kB │ gzip: 48.52 kB`, `✔ Build complete`

## Status

Status: DONE
Summary: Phase 4 implemented and review fixes applied — `-y` skips the confirm, existing mode uses
the detected manager everywhere, `--no-vscode` reaches preflight and plan, sort failures exit 1,
`git init` failure names the next step; full gate green (201 tests), nothing committed.
Concerns: none blocking.
