---
phase: 3
title: "Agent and docs foundation"
status: completed
priority: P2
effort: "1.5h"
dependencies: [2]
---

# Phase 3: Agent and docs foundation

## Goal
Make the repository its own authority for agents and humans: AgentKit registered, a short CLAUDE.md, a real README, and docs that state only what exists. This applies K1's rule that the repo, not chat context, is where agents learn what is true.

## Context
- F12: the repo uses AgentKit for now. `ak init --dry-run` in `yyyy` (2026-10-19, ak 3.0.0-beta.25) reported 0 files tracked: kits are installed globally, so the project init only registers the project under `.agentkit/`.
- Global CLAUDE.md layout: `docs/{project-overview-pdr,code-standards,codebase-summary,design-guidelines,deployment-guide,system-architecture,project-roadmap}.md`. Create only the files that have real content now. `design-guidelines.md` waits for the first TUI work, and `deployment-guide.md` waits for the release phase.
- K1 purge rule: no stale or speculative text. The lean architecture in the brainstorm report is still a leaning, so `system-architecture.md` describes what exists (entry point, build, tests) and links the leaning as a proposal.

## Open item raised at this step
- Where do decision records live? Leaning: `docs/decisions/NNNN-<slug>.md`, quoting the user, one file per answered question F1 to F12. Ask before writing them.

## Files to create
- `.agentkit/` via `ak init --no-interactive` (default docs and plans dirs: `docs/`, `plans/`). Commit what it writes, unless its own docs mark a file as machine-local.
- `CLAUDE.md`: what this repo is (rewrite of jss-devtools), commands (`pnpm lint|typecheck|test|build`), the "checks before claiming done" rule, links to docs, knowledge base and open questions, and the rule to raise open questions at the blocking step.
- `README.md`: what exists today (CLI skeleton), requirements (Node >=24, pnpm 11), development commands. No install section until the release phase.
- `docs/project-overview-pdr.md`: goal and non-goals from the knowledge base.
- `docs/code-standards.md`: formatting, lint, naming (kebab-case files), commit convention, test layout, the architecture-test rule.
- `docs/codebase-summary.md`: the current tree.
- `docs/system-architecture.md`: entry point, build (tsdown with inlined deps), test strategy, with a link to the lean-architecture proposal.
- `docs/project-roadmap.md`: phase 0, then the next plans (core module layout, toolchain module, harness module, release and install site), all marked as not started.
- `docs/decisions/` only after the open item above is answered.

## Steps
- [x] `ak init --no-interactive` and check the result.
- [x] Ask the decision-records question, then write the docs.
- [x] Commit: `docs: add agent setup, readme and project docs`.

## Verification
- Every relative link in README, CLAUDE.md and docs resolves (`grep -o '](\./[^)]*)'` plus `test -e`).
- `grep -rn "TBD\|TODO" README.md CLAUDE.md docs` returns nothing.
- `pnpm lint` still passes (Prettier ignores or formats markdown consistently).
