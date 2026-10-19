# Scout Report: jearax/repository-harness (K1)

Knowledge source label: **K1**.

Source: https://github.com/jearax/repository-harness (fork of `hoangnb24/repository-harness`, ~1.2k stars upstream). Fork HEAD `485fd40` equals upstream `main` HEAD: no fork-specific changes as of 2026-10-18.

## What it is

An installer + safe updater that drops a small "repository protocol" (AGENTS.md, docs map, workflow rules, templates, explicit-only skills) into any repo so coding agents (Claude Code, Codex, Cursor) can work from repo authority instead of chat context. Explicitly NOT a task tracker, orchestrator, or runtime. v0.1.10, Rust binary `harness`, 121 files, ~4.9k LOC Rust.

## Notable traits

1. Anti-fabrication doctrine: code/tests show current behavior but are not authority for missing product policy; agent must stop and ask the smallest decision. Unobserved state stays "Unknown".
2. Evidence levels kept separate: local check vs optional hook vs checked-in CI vs observed CI result vs branch protection. None proves another.
3. All skills set `allow_implicit_invocation: false` (openai.yaml) - installation never activates them.
4. Updater: stores exact upstream base in `.harness-core/`, three-way merge via `git merge-file --diff3`, journal + backups, provenance committed last, executable replaced last, rollback of interrupted applies, symlink rejection.
5. Conflicts never write markers into live files; BASE/LOCAL/UPSTREAM/RESOLVED staged under `.harness-core/update/`, human decides, `update --continue` rejects markers and drift.
6. Self-update trust: dedicated `harness-v*` release pointer, SHA-256 sidecar, version must match pointer, downgrade rejected. Docs openly state SHA-256 is not a publisher-compromise trust root.
7. Clean architecture enforced by test (`crates/harness/tests/clean_architecture.rs`) using string-scan of forbidden imports, with positive and negative fixtures (dogfooding its own `encode-invariant` pattern).
8. Onboarding skill is paranoid read-only: no temp files, no heredocs, zsh special-variable warnings, hashed ignored-state baselines, Evidence Capsule v2 with pinned source ranges + producer-skill blob hash, plus an independent `audit-onboarding-proposal` skill run in a fresh session.
9. `improve-harness` requires observed baseline + fresh rerun before claiming improvement.
10. Previous SQLite control plane / protocol v1 removed (EOL 2026-08-10), deliberately purged from tree so agent retrieval only sees current authority.

## Relevant Files

- `README.md`, `AGENTS.md`, `docs/WORKFLOW.md` - protocol text installed into consumers
- `docs/HARNESS.md`, `docs/ARCHITECTURE.md` - product model, layer and update-transaction design
- `docs/patterns/encoding-invariants.md` - authority -> boundary -> native check -> positive/negative proof
- `docs/decisions/0025-*.md`, `0027-*.md`, `0028-*.md` - self-update/conflicts, v1 EOL, invariant encoding
- `scripts/harness-install-files.txt` - exact installed payload (embedded in binary)
- `scripts/install-harness.sh|.ps1` - bootstrap, `--merge/--override/--dry-run`
- `crates/harness/src/application/service.rs` (793 LOC) - install/update/status/doctor policy
- `crates/harness/src/infrastructure/filesystem_state.rs` (1036 LOC) - transactions, locks, journal
- `crates/harness/src/infrastructure/release_handoff.rs` - download, checksum, exe replacement
- `crates/harness/src/infrastructure/git_merge.rs` - three-way merge adapter
- `.agents/skills/{onboard-repository,audit-onboarding-proposal,encode-invariant,improve-harness,engineering-wisdom}/`
- `scripts/validate-premerge.sh` - fmt, tests, clippy, installer/workflow/release/doc contract checks

## Unresolved Questions

- Does the fork owner (jearax) plan diverging changes? Currently identical to upstream.
- Updater requires `git` on PATH for merging; behavior when absent only seen via `available()` port, not traced end to end.
- `.agents/skills/` path: discovered natively by Codex; whether Claude Code picks them up without extra wiring (`scripts/claude-harness-block.md`) not verified.
