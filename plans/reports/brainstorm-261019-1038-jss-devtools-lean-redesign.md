# Brainstorm: lean redesign of jss-devtools (toolchain + harness)

Status: proposals only; nothing here is decided. Open items: `plans/261019-1050-jss-devtools-rewrite/open-questions.md`.

Inputs: jss-devtools 0.6.4 (`/Users/tandm/Documents/jearax/npm/jss-devtools`), harness 0.0.1 prototype (`/Users/tandm/Documents/jearax/dokploy/harness`), K1, K2, K3. Prior reports: `scout-261019-1008-jss-devtools-overhaul.md`, `scout-261019-1029-harness-local-and-merge-direction.md`.

## Outcome, constraints, non-goals

- Outcome: a new CLI published as `@jjuidev/jss-devtools`, written from scratch. It reuses ideas and proven code from both repos but not their structure. The command tree nests the way docker's does.
- Constraint: handle the cases that actually occur. Each defensive mechanism must point to a failure that has happened or that is likely in a single-package JS repo used with Claude Code.
- Non-goals: a gradual migration of the old code, compatibility with unpublished harness 0.0.1 repos, monorepos, and agents other than Claude.

## Real cases (what the CLI must do)

1. `init` on an existing single-package repo: overlay the toolchain (with a framework preset), and optionally the harness.
2. `update` after a CLI upgrade: refresh managed files, without silently clobbering local edits.
3. Claude Code sessions: onboarding on the first session, context at session start, and a review prompt after real work.
4. `doctor`: report what is broken, with a hint for each finding.

## What to cut, with evidence

| Mechanism | Size today | Why it is more than the real case needs | Lean replacement |
|---|---|---|---|
| Three-way merge, block-region BASE in `.harness/core`, staging with `--continue`/`--abort`, transaction journal and recovery, file lock, 3 backups | harness `updater/` 1,564 LOC | Managed files are already declared "never edit" (`harness-review` skill: "Never edit `harness-*` skills or `.harness/templates/`"). Init and update already demand a clean git tree, so git is already the rollback and the merge tool. | `.jss/manifest.json` maps each managed path to the sha256 written. On update: if the hash matches, overwrite; if it drifted, show the diff and ask overwrite or keep. The CLAUDE.md block is replaced between markers. |
| Init resume record (`init-pending`) | `init-progress-record.ts` and a branch in `init-command.ts` | It only exists because init commits after a verify step that can fail halfway | No auto-commit, so there is nothing to resume. Recovery is `git checkout . && git clean`. |
| Preflight runs `npx jss-devtools init --dry-run --json` twice (scratch dir and repo) | `preflight-checks.ts` | Consequence of the toolchain living in another process | In-process: toolchain ops are computed, not shelled out |
| Live npm registry lookup for peer-compatible versions | jss `resolve-specs.ts` 200 LOC plus `registry-client` | Non-deterministic: the same CLI version produces different installs over time. harness already chose an explicit version table (decision 0010). | One tested version table per preset, in code; bumped in a commit |
| Duplicated result and JSON error envelopes, citty argv workarounds, figlet | jss `run-init-flow.ts`, `args.ts`, `banner.ts` | Covered in the 1008 report | One `emit(result)` plus commander |
| Agent-kit variants (`withoutAgentKit` asset copies) and the enable-agent-kit path for already-initialized repos | `assets/variants/*`, `enable-agent-kit.ts` 89 LOC | Doubles the asset matrix to change one sentence | One README text that mentions where ak works. `--agent-kit` only runs `ak init --docs-dir --plans-dir`. |
| Skill-usage ledger, curator, usage-based archiving, PostToolUse on every tool call | `skill-usage.ts` 167 LOC, `post-tool-use-hook.ts` 117 LOC | The reverted commit already deferred archiving until there are ten learned skills, which shows there is no usage data yet | Hooks only on SessionStart and Stop (plus PostToolUseFailure if failures should trigger review). Add curation when learned skills exist. |
| 160 KB CLI bundle committed into every repo, install.sh, install site, GitHub release, checksums | decisions 0002 and 0011, `deploy/`, `.github/workflows/` | A repo needs only the hook logic, not the whole CLI | Two small zero-dependency hook scripts as managed files in `.claude/hooks/`. The CLI ships through npm and runs with `npx` (or a global install). |
| Fresh-repo scaffolding: `git init`, `npm init`, ESM package.json, harness README | decisions 0019, 0020, `write-foundation.ts`, `readme-file.ts` | jss roadmap lists scaffolding as out of scope | Depends on the answer to Q4 |

Keep: plan/apply with a pure plan function, stderr logs and stdout data, non-TTY degrade, a single conflict prompt, preflight that reports all failures at once, foreign-linter and monorepo refusal, `CliContext`-style injection for in-process tests, decision records with user quotes, BOOTSTRAP.md plus a commit that deletes it as the onboarding state.

## Lean architecture

```text
src/
  cli.ts                     commander root; registers each command group
  commands/
    init.ts                  parse -> collect ops -> preview -> confirm -> apply -> emit
    update.ts                same pipeline, managed files only
    doctor.ts                run checks -> emit findings
    harness/*.ts             harness subgroup (status, ...)
  core/
    ops.ts                   one union: write | json-patch | block | remove | install | run
    plan.ts                  merge ops from modules, detect conflicts and drift
    apply.ts                 apply ops in order; requires clean tree
    manifest.ts              .jss/manifest.json: cli version, modules, managed path -> sha256
    output.ts                one result shape, clack renderer or --json, exit codes
    context.ts               cwd, env, tty, prompts (injectable for tests)
  modules/
    toolchain/               presets as data: files, deps (version table), scripts
      node.ts react.ts next.ts nest.ts
    harness/                 managed files, CLAUDE.md block, hook scripts, skills
templates/                   static files, bundled as text
```

Every feature is a module, `(ctx, options) => Op[]`. `init --harness` collects ops from both modules, shows one preview, asks once, and runs one install. `update` recomputes the ops for the modules recorded in the manifest and compares hashes. A new preset or module is a new file; no existing flow changes.

## Lean flows

- `init [--framework] [--harness] [--agent-kit] [--yes] [--dry-run] [--json]`: preflight (read-only, all failures) -> ops -> preview -> one confirm (overwrite / keep / cancel for conflicts) -> write files -> one install -> husky -> manifest -> print next steps and the suggested commit.
- `update [--dry-run]`: preflight (clean tree) -> recompute ops -> unchanged files overwritten, drifted files listed with a diff and one prompt -> manifest.
- Hooks: SessionStart injects the onboarding notice (while `BOOTSTRAP.md` exists), memory and the decision index. Stop asks the onboarding question once per session, and asks for a review when the git status hash changed since session start.

## Unresolved Questions

1. Updater: hash drift plus git (recommended), or keep the three-way merge?
2. Commits: the CLI never commits and suggests the command (like decision 0017), or auto-commit (decision 0009)?
3. Onboarding: ask first (decision 0018), or force-run?
4. Empty-folder scaffolding (git init, npm init, README): drop, or keep?
5. Where to write the new CLI: a new major branch in the jss-devtools repo, or a fresh repo?
6. Version: 0.7.0 (0.x allows breaking changes), or 1.0.0 to mark the rewrite?
