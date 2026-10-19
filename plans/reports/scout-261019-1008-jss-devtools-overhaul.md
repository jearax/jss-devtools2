# Scout Report: jss-devtools overhaul + harness direction

Repo: https://github.com/jearax/jss-devtools (`@jjuidev/jss-devtools` 0.6.4, HEAD `f0ce945`, 139 commits, 128 files, ~5.8k LOC src+tests). Context sources: K1 (repository-harness), K2 (Hermes self-learning), K3 (OpenClaw first-run bootstrap).

## Current state

`jss-devtools init` overlays an opinionated toolchain (eslint flat, prettier, editorconfig, husky, lint-staged, commitlint, tsconfig alias, .vscode, .gitignore) on an existing single-package Node/TS project. Only `node` framework; `react | next | nest | rn` reserved. Self-management commands removed in 0.6.0 (left to PM).

Core design is sound and worth keeping:
- `preflight -> resolveSpecs -> computePlan (pure) -> confirmPlan -> applyPlan` pipeline.
- `PlanAction` discriminated union (write/update/remove-file, manifest-edit, install, git-init, husky-activate).
- logs to stderr, data to stdout (`--json | jq` safe, EPIPE handled); non-TTY degrade; idempotent re-run; single conflict gate; peer-aware version resolution.

## Problems found (verified)

| # | Finding | Evidence |
|---|---|---|
| 1 | **Unexpected errors exit 0.** Global `uncaughtException`/`unhandledRejection` handlers log and override Node's default exit 1. CI would read a crash as success. | `src/cli.ts:7-8`; reproduced: handler + throw -> `exit=0` |
| 2 | **citty cannot carry docker-style nesting.** Reproduced on citty 0.2.2: parent `run()` executes after subcommand (double exec), nested usage path wrong, no "did you mean", ANSI codes in non-TTY output. Repo journal 2026-08-28 already hit this and switched to manual dispatch. | scratchpad probe; `plans/journals/2026-08-28-...citty-subcommand-trap...md` |
| 3 | Workarounds caused by citty: hidden `--no-*` flags scanned from raw argv; `--version` special-cased before `runMain`; framework validation hand-rolled. | `src/commands/init/utils/args.ts`, `src/cli.ts:12-17` |
| 4 | Result envelope built 5 times (errorResult, abort JSON, cancelled, dry-run, final) plus a second JSON error shape in `init.ts` (`result: 'error'` vs `status`). Two JSON error contracts. | `run-init-flow.ts`, `commands/init.ts` |
| 5 | Repo clutter: `chat2k/` notes, obsolete early-scaffold `plans/phase-0x*.md` + `plans/plan.md`, many closed plans/reports in the published repo. README stale ("Early scaffold", Build TBD, License TBD, layout TBD). | file list, `README.md` |
| 6 | `figlet` dependency only for a help banner. | `src/utils/banner.ts` |
| 7 | `tsup` README: "not actively maintained anymore, consider tsdown". | `npm view tsup readme` |

## Leaning (not decided): CLI/TUI layer

| Layer | Choice | Why |
|---|---|---|
| Command parsing | **commander 15** (+ `@commander-js/extra-typings`) | Probe verified: nested `harness skill --help`, aliases (`list|ls`), "Did you mean skill?", native `--no-install` negation, required-arg errors, unknown option exit 1. ESM, Node >=22.12 (repo requires 24). Most used, stable. |
| Prompts / progress | **keep `@clack/prompts`, bump to 1.8** | Already used; 1.8 exports `tasks`, `taskLog`, `box`, `note`, `group`, `autocomplete`, `isCI`, `isTTY`. Enough for a scaffold CLI. |
| Rejected | Ink 8 (React runtime overkill for linear flows), oclif 5 (plugin framework + manifest overhead), clipanion (still 4.0 rc since 2024), yargs (weaker nested help ergonomics), cac (thin nesting) | |
| Banner | drop `figlet`; plain styled name line on root help only | dependency weight, help noise |
| Build | keep tsup now; migrate to tsdown in a separate step | out of TUI scope; tsdown still 0.x |

Version (leaning): **0.7.0 (minor)**. Public contract stays: `init` flags (`--framework --yes --dry-run --json --no-linter --no-commitlint --no-install`) and the JSON result schema. Help text formatting changes, which is not a contract. Reserve 1.0.0 for when the command tree stabilizes.

## Proposed command tree (docker-style)

```text
jss-devtools
├── init [--framework <id>] [--harness] [--yes] [--dry-run] [--json] [--no-linter] [--no-commitlint] [--no-install]
└── harness
    ├── init        add/refresh harness in an existing repo (same engine as init --harness)
    ├── status      bootstrap pending/complete, managed-file drift
    └── doctor      detect/repair findings (K3 contract)
```

Each command module = `register(parent: Command)` + pure `plan` + shared `apply`/`emitResult`.

## Harness feature (synthesis K1 + K3, K2 later)

- K1: compact `AGENTS.md`/`CLAUDE.md` entry + docs map; repo is system of record; explicit-only skills.
- K3: per-init first-run bootstrap: `.jss/state.json` (`initId`, `stack`, `cliVersion`, `bootstrapSeededAt`, `setupCompletedAt`), `BOOTSTRAP.md`, `.claude/settings.json` SessionStart hook (`startup|resume|clear|compact`, `additionalContext`), `.claude/skills/jss-bootstrap/`, local `bootstrap-complete.mjs` (state first, then delete file). `initialUserMessage` is `-p`-only, so not usable.
- Agent adapters: `claude` now; `AGENTS.md` fallback line covers others at near-zero cost.
- K2 (self-learning loop): not in first harness release.

## Unresolved Questions
- Exact harness payload: which K1 docs (AGENTS.md only, or docs/ map + templates)? What does `jss-bootstrap` skill do per stack?
- Should `--harness` be usable alone (`harness init`) without the toolchain, e.g. on repos that use biome?
- Clean repo history items (`chat2k/`, old plans) delete or move out of the published repo?
- Keep the published JSON error shape (`result: 'error'`) or unify on `status: 'error'` (breaking for JSON consumers)?
