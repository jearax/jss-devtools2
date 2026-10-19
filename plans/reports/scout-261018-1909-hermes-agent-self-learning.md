# Scout Report: Hermes Agent self-learning (K2)

Knowledge source label: **K2**. Site: https://hermes-agent.nousresearch.com/ . Repo: https://github.com/NousResearch/hermes-agent (MIT, Python; scouted at `9e01b44`, 2026-10-18; ~20k files).

Scope: verify self-learning claims (auto skill creation, skill self-improvement, memory) and the mechanism, from docs + source.

## Verdict on claims

| Claim | Status | Evidence |
|---|---|---|
| Auto-creates skills | Verified | Background review fork + `skill_manage(create)`; system prompt `SKILLS_GUIDANCE` (`agent/prompt_builder.py:258`) |
| Improves existing skills | Verified (strongest part) | Review prompt preference order: patch loaded skill first (`agent/background_review.py:448`) |
| Prunes / consolidates library | Verified | Curator (`agent/curator.py`, docs `curator.md`); prune on by default, LLM consolidation opt-in |
| Persistent memory across sessions | Verified | `MEMORY.md` (2,200 chars) + `USER.md` (1,375 chars), frozen snapshot per session; `session_search` over SQLite FTS5 |
| "Never forgets how it solved a problem" | Marketing; partially true | Only if review fork judged it worth saving; bounded memory; curator archives unused skills after 30 days |
| Learn from sources on demand | Verified | `/learn` builds one prompt (`agent/learn_prompt.py`), agent authors skill via `skill_manage` |

## Mechanism

### 1. Triggers (counter-based, not cron)
- Skill review: `_iters_since_skill` +1 per tool iteration (`agent/turn_iteration_prep.py:167`); fires when >= `skills.creation_nudge_interval` (default 10) at turn end (`agent/turn_finalizer.py:764`).
- Memory review: `_turns_since_memory` +1 per user turn; fires at `memory.nudge_interval` (default 10) (`agent/turn_context.py:763`).
- Both counters reset when the foreground agent itself calls `memory` / `skill_manage` (`agent/tool_executor.py:747`) - no double work.
- Runs only after the response is delivered, not interrupted, and not `skip_background_review` (cron sets it; ~30K tokens per review).
- Manual trigger: `/refine [focus]`.

### 2. Background review fork
- `build_cache_parity_fork` (`agent/background_review.py:965`): detached `AIAgent` clone with byte-identical system prompt + `tools[]` -> warm prompt cache. Routed to a different (cheaper) model -> replays a digest (last 24 msgs verbatim, older collapsed).
- Persistence isolated: no state.db writes, shares session_id only for cache warmth; harness messages stripped from history (`hermes_state.py:310`).
- Max 16 iterations. Tool whitelist enforced at dispatch, not advertisement (keeps cache): `skills` toolset + `read_file`/`search_files`; `memory` only when memory trigger fired. Write tools/terminal denied with a redirecting message.
- Prompt three variants: memory / skill / combined.

### 3. Review prompt content (the "learning policy")
- Bias to act: "a pass that does nothing is a missed learning opportunity".
- Signals: user correction of style/format/workflow (frustration = first-class signal), non-trivial technique, loaded skill found wrong.
- Preference order: patch currently-loaded skill -> patch existing umbrella -> add `references/`/`templates/`/`scripts/` support file -> create new class-level skill (name must not be PR number/error string/session artifact).
- Shape rules ("lessons, not logs"): pitfall = generalizable rule + one-clause why; no incident narrative/dates/IDs; dedupe; fix in place, no "UPDATE:" appends; do not duplicate AGENTS.md or tool schemas.
- Do-not-capture: env-dependent failures, negative claims about tools ("X is broken"), transient errors, one-off tasks, unresolved failures dressed as workflow.
- Memory routing: USER.md (who user is) vs MEMORY.md (environment facts); one fact, one store; user-preference lessons go into the governing skill, not memory.
- Never delete skills in review; overlaps reported for curator.

### 4. Guardrails on writes (`tools/skill_manager_guards.py`, `tools/skill_manager_tool.py`)
- Read-before-write enforced: review fork must `skill_view` the exact target in this review before patching (transcript copies do not count).
- Delete guard: review fork may delete only curator-managed (`created_by: agent`) skills; never pinned, bundled, hub, external, protected.
- Atomic write + optional security scan (`skills.guard_agent_created`), rollback on block.
- Advisory linter: `incident-log-shape`, `references-sprawl` (>60 files), `oversized-body` (>~24k chars). Warn only.
- Optional human gate `skills.write_approval: true` -> staged under `~/.hermes/pending/skills/`, `/skills diff|approve|reject`. Same for memory.
- Append-only ledger `.curator_ledger.jsonl` (actor/action/before-after sha256, content-addressed blobs) -> single-mutation rollback. Ledger is telemetry, never a gate.

### 5. Curator (library maintenance)
- Inactivity-triggered: every `interval_hours` 168 and idle >= 2h; first run deferred one full interval.
- Phase 1 deterministic: unused 14d -> stale, 30d -> `.archive/` (never delete). Skips pinned and cron-referenced skills; zero-use grace floor.
- Phase 2 LLM consolidation (opt-in, 50-100 API calls): merge into class-level umbrellas, tar.gz snapshot before, rename map in report.
- Jurisdiction = `created_by: agent` only (set by background review). Foreground/`/learn` skills = `created_by: learn` -> user-owned, not archived. `hermes curator adopt` hands over by declaration ("provenance is declared, never inferred").
- Telemetry `.usage.json`: view/use/patch counts.

### 6. Observability
- `/journey` timeline of learned skills + memory; per-run `~/.hermes/logs/curator/<ts>/REPORT.md`.

## Relevant Files
- `agent/background_review.py` - fork construction, prompts, whitelist, run loop
- `agent/turn_finalizer.py`, `agent/turn_context.py`, `agent/turn_iteration_prep.py`, `agent/tool_executor.py` - trigger counters
- `agent/agent_init.py:1304-1390` - default intervals from config
- `tools/skill_manager_tool.py`, `tools/skill_manager_guards.py` - `skill_manage` actions + guards
- `tools/skill_provenance.py`, `tools/skill_ledger.py`, `tools/skill_usage.py`, `tools/write_approval.py`, `tools/skill_linter.py`
- `agent/curator.py`, `agent/curator_backup.py`, `hermes_cli/subcommands/curator.py`
- `agent/learn_prompt.py` - `/learn`; `agent/prompt_builder.py:258` - system guidance
- `tools/memory_tool.py`, `agent/memory_manager.py`, `tools/session_search_tool.py`
- Docs: `website/docs/user-guide/features/{skills,curator,memory}.md`

## Contrast with K1 (repository-harness)
- K1: skills explicit-only, never self-activate, repo is the authority. K2: autonomous by default, agent edits even hand-written skills.
- K2 compensates with reversibility (ledger, archive, snapshots) and optional approval gate instead of prevention.

## Unresolved Questions
- No public eval in repo was found proving review quality improves outcomes; only guard/telemetry tests seen (not exhaustively searched in `evals/`).
- Curator LLM prompt text not read in full (`agent/curator.py`); summarized from docs.
- Docs inconsistency: curator.md says both 14/30 days and 30/90 days for stale/archive; defaults block says 14/30.
