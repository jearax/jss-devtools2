# Knowledge base: jss-devtools rewrite

Living notes for the rewrite. These record goals, philosophies, features and techniques from every source. Nothing here is a decision. Decisions get made during plan and implement; open items live in [open-questions.md](./open-questions.md).

## Sources

| Label | Source | Report |
|---|---|---|
| K1 | jearax/repository-harness (fork of hoangnb24/repository-harness, Rust, v0.1.10) | `plans/reports/scout-261018-1848-repository-harness.md` |
| K2 | Hermes Agent self-learning (NousResearch) | `plans/reports/scout-261018-1909-hermes-agent-self-learning.md` |
| K3 | OpenClaw first-run bootstrap (only the first-run pattern is wanted) | `plans/reports/scout-261018-1928-openclaw-bootstrap-onboarding.md` |
| JSS | `@jjuidev/jss-devtools` 0.6.4, `/Users/tandm/Documents/jearax/npm/jss-devtools` | `plans/reports/scout-261019-1008-jss-devtools-overhaul.md` |
| H0 | Old harness prototype 0.0.1, `/Users/tandm/Documents/jearax/dokploy/harness` (unpublished) | `plans/reports/scout-261019-1029-harness-local-and-merge-direction.md` |

## Goal (user's own framing, 2026-10-19)

- Write a new CLI under the name `@jjuidev/jss-devtools`, built from the ideas of all the sources above. It is a rewrite, not a merge, and not a refactor of either old repo.
- It should be clear, easy to maintain and easy to scale up. Flows are redesigned to be minimal: handle the real cases and drop over-engineered ones.
- The command tree nests like docker's (`docker --help` -> `docker images --help` -> ...).
- The CLI does two things:
  - Toolchain: `init` a JS-stack repo (node now; React, Next, Nest, RN planned).
  - Harness: `init --harness`. The main idea is to learn from K1 (repo as the agent's authority, a safe updater) and from K2's self-learning loop, so that an agent repo **stays excellent over time**. K3 adds one small idea: the first-run bootstrap.
- Coding agent: Claude Code first. Other agents are a later possibility.
- The user is not satisfied with H0 even though it works and its tests pass. Treat H0 as a source of ideas and lessons, not as code to keep.

## Philosophies worth carrying

### K1: the repo is the authority
- Agents work from what is in the repository, not from chat context. The harness is a protocol, not a task tracker, orchestrator or runtime.
- Anti-fabrication: code and tests show current behavior, but they are not authority for missing product policy. The agent stops and asks for the smallest decision. Unobserved state stays "Unknown".
- Keep evidence levels separate: a local check, an optional hook, checked-in CI, an observed CI result and branch protection each prove only themselves.
- Skills are explicit-only: installing them never activates them (`allow_implicit_invocation: false`).
- Purge retired designs from the tree, so agent retrieval only ever sees current authority.
- Enforce architecture with tests (positive and negative fixtures), not with documentation alone ("encode invariants").
- Claim an improvement only against an observed baseline plus a fresh rerun.

### K2: learn continuously, stay reversible
- Learning is automatic and triggered by counters (tool iterations, user turns), not by cron. It runs after the response is delivered, so it never blocks the user.
- "Lessons, not logs": a pitfall is a general rule plus a one-clause reason. No incident narrative, dates or IDs. Fix in place instead of appending "UPDATE:".
- Order of preference: patch the skill that was used -> patch an umbrella skill -> add a support file -> create a new class-level skill (named for the class of problem, never the incident).
- Do not capture environment-dependent failures, negative claims about tools, transient errors, one-off tasks, or unresolved failures dressed up as workflow.
- Route memory: one fact goes to one store (user facts vs environment facts). User-preference lessons go into the skill that governs them.
- Autonomy is paid for with reversibility: a ledger, archive instead of delete, snapshots, and an optional approval gate.
- Provenance is declared, never inferred (`created_by: agent` decides what the curator may touch).

### K3: the first run is a ritual, not a gate
- Seed a `BOOTSTRAP.md`, have the first interactive session handle it, record completion, then delete the file. Completion state is authoritative; cleaning up the file is best-effort.
- Validate every flag and the TTY before any destructive step. Do the reset last.
- Make one required gate live-proven; everything else is optional and can be re-run.
- Doctor follows a detect/repair contract, with stable check IDs and a fix hint on each finding.
- Idempotent re-run means "verify and repair".

### JSS: plan, then apply
- A pure `computePlan`, then `applyPlan`, so preview, `--dry-run` and `--json` come from the same plan.
- Logs go to stderr and data to stdout (`--json | jq` is safe). EPIPE is handled.
- Degrade cleanly without a TTY or under CI. Re-runs are idempotent. Conflicts get one prompt.
- Opinionated presets that compose each framework's official eslint config (roadmap).

### User principles (stated during planning)
- Consumer-facing version floors trail the newest supported release instead of chasing it: "không lấy nodejs latest, mà chỉ lấy nodejs latest supported lùi về trước 3 version" (user, 2026-10-19). Applies to what consumers must have (runtime of the shipped CLI, versions it generates into their repos), not to dev-only pins in this repo. For Node on 2026-10-19 (nodejs/Release schedule.json): supported lines are 26 (current, LTS 2026-10-28), 24 (LTS, maintenance from 2026-10-20), 22 (maintenance until 2027-04-30), so three supported lines back from 26 gives a floor of 22.
- The tool's own source must be clean before features are built on it (2026-10-19).
- Distribution is native (curl, sh, wget) and deploys through a VPS with Dokploy; no npm in CI/CD (2026-10-19).
- This repository's own toolchain is the reference output for `jss-devtools init`: "khi `jss-devtools init` thì expect của tôi cũng 80 ~ 90% như này" (user, 2026-10-19). Frozen as branch `checkpoint/init-reference` at `68f5e83`, so later work on `main` does not move the reference. Which parts are generated and which stay specific to this repo is open question T5.

### H0: knowledge and ownership
- Three layers each own their files: toolchain (jss), agent workflows (AgentKit, optional), knowledge and learning (harness). `.claude/settings.json` is merged entry by entry.
- Repo knowledge lives in `.harness/` (memory index, docs, decisions, plans). Personal knowledge stays in Claude auto-memory (decision 0008).
- Decisions quote the user's own words, redacted by the agent (0016). The decision directory is the only product policy.
- Memory is an index with a size cap; longer facts go to docs, with a pointer line.
- Review and curation never commit; they list the files and suggest the command (0017).
- Hooks must never break a Claude session: they log errors and exit 0.

## Features worth carrying (candidates)

| Feature | From | Note |
|---|---|---|
| Docker-style nested commands with per-level help and "did you mean" | user goal | commander 15 behaved correctly in a probe; citty 0.2.2 did not |
| `init` toolchain overlay with framework presets | JSS | Existing single-package repos |
| Managed files that update safely without silently clobbering local edits | K1, H0 | The mechanism is still open (three-way merge vs hash drift) |
| First-run onboarding through `BOOTSTRAP.md`, a SessionStart notice and an onboarding skill | K3, H0 | Ask-first vs force-run is still open |
| SessionStart context: memory index, decision index, health issues | H0 | Snapshot at session start |
| Stop-hook review trigger after real work, plus the `review` skill that routes each lesson to one store | K2, H0 | The trigger rule is still open (decision 0021 was reverted) |
| Curator: archive unused learned skills, consolidate | K2, H0 | Probably premature until learned skills exist |
| Knowledge templates (decision, skill, docs topic/architecture/runbook) | K1, H0 | |
| Doctor with check IDs and fix hints | K3, H0 | |
| Secret and home-path redaction checks on committed knowledge | H0 | Real risk, because knowledge is committed |
| A single explicit version table for toolchain dependencies | H0 (0010) | vs JSS live registry resolution |
| Preflight that reports all failures at once | H0, K3 | |
| `--json` envelope plus stable exit codes | JSS, H0 | The two sources disagree today |

## Techniques (verified)

- Claude Code hooks: SessionStart matchers `startup|resume|clear|compact`. Inject context through `hookSpecificOutput.additionalContext`. SessionStart cannot block the session. `initialUserMessage` only works in `-p` mode, so a skill cannot be force-run interactively from a hook. The Stop hook can push one prompt back to the agent (H0 uses this to force the onboarding question once per session; it checks `stop_hook_active` to avoid loops).
- `${CLAUDE_PROJECT_DIR}` in the hook command; subagent events carry `agent_id` (H0 skips them in counters).
- Git worktree fingerprint to detect changes made through Bash, which an Edit/Write counter cannot see (H0).
- Embedding static assets into the bundle through a generated module, with a CI freshness check (H0). tsup/tsdown text loaders are an alternative.
- Atomic write (temp file plus rename); write the state first, then delete the file (K3).
- A K1-style updater stores BASE, merges with `git merge-file --diff3`, stages conflicts outside live files, commits provenance last, and rejects symlinks.

## Lessons from the old code (evidence)

- citty 0.2.2: a parent `run()` executes after the subcommand, nested help is wrong, there is no suggestion on typos. JSS already had to dispatch manually (journal 2026-08-28).
- A global `uncaughtException` handler turns crashes into exit 0 (JSS `src/cli.ts`; reproduced).
- Two CLIs that talk through stdout create fragile contracts: H0 scrapes JSON from `npx jss-devtools --json` and has to accept two error shapes.
- The H0 updater (1,564 LOC of transaction journal, lock, staging and backups) protects files that policy already forbids editing, inside a flow that already requires a clean git tree.
- Preflight that shells out to dry-runs (twice) is slow and couples the tools.
- Usage-based curation was built before there was usage data (the reverted commit deferred archiving until 10 learned skills).
- Asset variants just to change one sentence double the matrix.
- Tests must isolate state directories (H0 bundle-smoke test writes into the repo's own `.harness/state`).
- Repo clutter (old plans, chat notes, stale README) misleads agent retrieval, which is K1's purge rule in practice.
