# Scout Report: local harness CLI + merge direction into jss-devtools

Repos scouted (2026-10-19):
- `/Users/tandm/Documents/jearax/npm/jss-devtools`: HEAD `f0ce945`, clean, identical to GitHub. Findings in `scout-261019-1008-jss-devtools-overhaul.md` still apply.
- `/Users/tandm/Documents/jearax/dokploy/harness`: `@jearax/harness` 0.0.1, private, local only, 30 commits, HEAD `51dfdca`. ~5.4k LOC src, ~3.5k LOC tests, 20 decisions (`.harness/decisions/`). One uncommitted line in `.claude/skills/release-check/SKILL.md`.

## Outcome

harness already implements all three knowledge sources: K1 (three-way updater, provenance, staged conflicts), K2 (PostToolUse counter, Stop-triggered `harness-review`, `harness-curate`, skill usage), and K3 (`.harness/BOOTSTRAP.md`, SessionStart notice, Stop hook forcing the onboarding question, `harness-onboard` deletes the file and commits). The core is solid and tested. The parts that are unclear and hard to scale are the CLI and orchestration layer, the same layer as in jss-devtools.

`jss-devtools init --harness` therefore means merging an existing product, not designing a new one. The main decision is which direction the dependency goes.

## Health (verified by running)

`pnpm typecheck` ok, `pnpm lint` ok, `assets:check` ok, vitest 117 passed / 5 skipped (the real-toolchain e2e tests are opt-in). Hook latency: about 0.03 s per PostToolUse call with the 160 KB bundle.

## Keep as is (good quality)

- `src/updater/`: three-way merge, transaction journal and recovery, file lock, staging in `.harness/update/`, provenance, symlink guards.
- `CliContext` dependency injection, which lets every command run in-process in tests.
- Hook dispatcher that never fails the session (errors go to `.harness/state/hook-errors.log`).
- `src/toolchain/adapters/` is the only code that knows an external CLI.
- `assets/` embedded through a generated module, with a CI freshness check.
- Decision records that quote the user.

## Problems

| # | Finding | Evidence |
|---|---|---|
| 1 | Hand-rolled dispatch. Adding a command means editing three places: the `USAGE` string, an options const, and the `switch`. The `hook`, `sync` and `curate` commands are hidden from usage. `as boolean` casts drop the types that `parseArgs` gives. | `src/cli.ts` |
| 2 | Dead flag: `--overwrite` is parsed, then always rejected. | `cli.ts` `INIT_OPTIONS`, `init-command.ts:31` |
| 3 | Coupling to jss-devtools through a subprocess: `npx @jjuidev/jss-devtools@0.6.3 init --json` with a 900 s timeout. The JSON is scraped from the first line that starts with `{`. Success checks both `result` and `status` because jss-devtools has two error shapes. The pin is 0.6.3 while jss-devtools is at 0.6.4 (the bump was in the reverted commit). | `jss-devtools-adapter.ts`, `assets/manifest.json` |
| 4 | Two unrelated "plan" models. jss uses `PlanAction` = write-file, manifest-edit, install and so on. The harness updater uses `PlanAction` = create, update, keep, seed, conflict and so on. `run-fresh-init.ts` (175 lines) is an imperative step list with snapshot and diff in between, not a plan/apply pipeline. | `src/init/run-fresh-init.ts`, `src/updater/planner.ts` |
| 5 | The two CLIs have no shared output contract. harness: plain lines, a readline `Proceed? [y/N]`, no `--json`, exit codes 0/1/2/3. jss: clack, a `--json` envelope, exit code 0/1 only. | `src/exit-codes.ts`, jss `run-init-flow.ts` |
| 6 | Unlanded design work. Commit `c5d6287` (decisions 0021-0023: review only after changes or failures, archiving waits for ten learned skills, remove `sync`) was reverted by `51dfdca`, which says it would come back "part by part" after review. Porting before deciding these would port stale behavior. | `git show 51dfdca` |
| 7 | Test leak. `tests/bundle/bundle-smoke.test.ts:56` runs the bundle hook with `CLAUDE_PROJECT_DIR` unset, so it writes into the repo's own `.harness/state/hook-errors.log`. The log has 20 entries; the latest came from this scout's test run. | log contents |
| 8 | The active plan `261013-1425-harness-0-0-1-typescript-cli` is still `in-progress`. Only the phase-6 go-live steps (public repo, tag, Dokploy site) remain, and those are the user's to do. | `plan.md` |

## Merge direction

| Option | Pros | Cons |
|---|---|---|
| A. Fold harness into jss-devtools as `src/harness/**` plus a `harness` command group (recommended) | One release train. No npx subprocess, JSON scraping or version pin. `init --harness` becomes one plan and one confirm. Publishes on npm. | Supersedes decision 0011 (GitHub release plus install.sh, npm deferred). The repo vendored runtime must stay zero-dependency, so it needs a second tsup entry. |
| B. Two packages; jss-devtools shells out to harness | Smallest code move | Circular pins (harness pins jss, jss would pin harness), two error contracts, two release flows |
| C. Monorepo with two packages | Clean boundary | Workspace tooling cost for one author; still two versions to align |

With A, the per-repo copy (`.harness/bin/harness.mjs`, decision 0002) stays, but it becomes a separate zero-dependency entry (hook, doctor, status) with no commander or clack. Upgrades move to `npx @jjuidev/jss-devtools@latest harness update`, which carries the new embedded assets.

Proposed tree:

```text
jss-devtools
├── init [--framework] [--harness] [--agent-kit] [--yes] [--dry-run] [--json] [--no-linter] [--no-commitlint] [--no-install]
└── harness
    ├── init                         harness only (repo with or without the toolchain)
    ├── update [--continue|--abort|--dry-run]
    ├── doctor
    ├── status
    ├── curate
    └── hook                         hidden; entry for the vendored runtime
```

## Corrections to the previous report

- Drop the proposed `.jss/state.json`. Harness keeps state through the existence of `BOOTSTRAP.md` plus a commit that deletes it, which is what teammates inherit through git. A second state record would duplicate that.
- "K2 later" is wrong: harness already ships the learning loop.
- "Agent adapter interface" conflicts with decision 0004 (Claude only, no registry). `src/adapters/claude-*` is already a seam that needs no registry.

## Unresolved Questions

1. Force-run vs ask: earlier the user said "force run skill". Decisions 0014 and 0018 say ask with AskUserQuestion ("run now" first), and 0014 explicitly rejected auto-run. Which one wins?
2. Merge direction: A (fold into jss-devtools)? If so, decision 0011 becomes superseded, harness moves to npm, and the jearax/harness repo plus the install site are retired.
3. Decisions 0021-0023 from the reverted commit: land, drop, or revisit before porting?
4. Do repos already initialized with harness 0.0.1 (test repos) need an upgrade path, or is a reset fine since it was never published?
5. When the merge happens, unify exit codes and the JSON contract on harness's 0/1/2/3, or on jss's 0/1?
