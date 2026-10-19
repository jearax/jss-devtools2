# Scout Report: OpenClaw bootstrap and first-run onboarding (K3)

Knowledge source label: **K3**. Site: https://openclaw.ai/ . Repo: https://github.com/openclaw/openclaw (MIT, TypeScript/Node; scouted at `6913563`, 2026-10-18; ~57k files). Installer read from https://openclaw.ai/install.sh (4,575 lines, read only, not executed).

Scope: how OpenClaw bootstraps itself and manages first use, as reference for a similar CLI the user plans to build. CLI path focused; native apps (macOS/Linux/iOS/Android) noted only where they share the same backend.

## Summary

First run is a 4-layer pipeline: installer -> `openclaw onboard` (inference-gated wizard) -> optional Gateway service install -> agent "birth" ritual on first real turn. One design rule drives it: **inference is the only required step, and it must be proven with a real completion before anything else is written or started.** Everything else is optional, skippable, and re-runnable.

## Layer 1: Installer (`install.sh` / `install.ps1`)

- `curl ... | bash` with flags + env mirrors: `--method npm|git`, `--version`, `--beta`, `--no-onboard`, `--no-prompt` (CI), `--dry-run`, `--verify`, `--verbose`. Every flag has an `OPENCLAW_*` env equivalent.
- Shows an **Install plan** panel (OS, method, version, detected checkout, dry-run, onboarding skipped) before acting.
- Prepares environment: detects/installs Node (nvm, Homebrew), checks Node's bundled SQLite version is safe.
- Detects existing checkout in `$PWD` and offers git install; git clone is transactional (staging dir) with verified rebase recovery.
- Uses `gum` (downloaded to temp) for pretty TTY UI, falls back to plain echo.
- Post-install branching (`main()` around line 4258):
  - Fresh install + TTY -> `exec </dev/tty; exec openclaw onboard` (re-attaches stdin because `curl | bash` consumed it).
  - No TTY -> prints "run openclaw onboard to finish setup".
  - Upgrade / existing config -> `openclaw doctor --fix` (non-interactive if no prompt), `plugins update --all`, restart Gateway service if loaded; skips onboarding.

## Layer 2: `openclaw onboard` (`src/commands/onboard.ts`)

### Routing (three runners)
- `--non-interactive` -> `onboard-non-interactive.ts`
- classic flags (`--classic`, `--install-daemon`, any non guided-safe option) -> `onboard-interactive.ts`
- default -> `onboard-guided.ts` (Quick start / Custom setup)
- `openclaw setup`: fresh system -> onboarding; configured system -> conversational setup agent chat. `--baseline` creates dirs only.

### Preflight before any state change
- All flag combinations validated first (mutually exclusive flags, remote-only flags, env-ref secret must match env var, `--reset-scope` needs `--reset`).
- `--non-interactive` requires `--accept-risk` (explicit acknowledgement; links security doc).
- Interactive requires a TTY, proven **before** destructive reset.
- `--reset` is deliberately the last pre-dispatch step; moves state to Trash; scopes `config | config+creds+sessions | full`.
- Whole run wrapped in `withSetupMigrationTargetLock(stateDir)`.

### Guided Quick start flow (`docs/start/wizard.md`)
1. One-line security pointer; Quick start records acknowledgement.
2. Read-only detection on the Gateway host: configured models, API-key env vars, Claude Code / Codex CLI logins, installed Ollama/LM Studio models. Never downloads models. Detection uses executable versions + credential presence only (no auth-status calls).
3. User explicitly picks one connection. Failure never auto-selects another provider.
4. Verification: save credential, run **one tool-free bounded completion** through the exact candidate route (`src/system-agent/setup-inference-turn.ts`, `disableTools: true`, capped tokens). Config (provider/model) committed only after success; failure keeps credential, leaves config unchanged (`setup-inference-transition.ts` uses merge-patch + conflict detection + undo capture).
5. Save route, prepare workspace, persist Gateway settings (port 18789, loopback, auto-generated token).
6. Start Gateway in foreground, open browser dashboard. Ctrl+C stops; config persists.
- "Skip for now": prepares workspace + local config, exits without starting anything. Summary distinguishes **Local setup** (config ok) from **Inference ready** (verified).
- Defaults are opinionated: agent `main`, full tool profile, telemetry consent unset, memory import skipped.

### Re-run / idempotency
- Re-run on configured install offers current model first for "verify and repair". Never wipes unless `--reset`.
- Invalid config or legacy keys -> asks to run `openclaw doctor` first.
- Interrupted baseline/team setup resumes on next run via a setup receipt (approved workspace, chosen coordinator remembered).
- Records provenance in config: `wizard.lastRunAt|Version|Commit|Command|Mode`, `wizard.securityAcknowledgedAt`.

### UI abstraction
- `WizardPrompter` interface (`src/wizard/prompts.ts`): intro/outro/note/select/multiselect/text(sensitive)/confirm/progress/openUrl/deviceCode, plus Back/Forward navigation errors.
- Same flow drives CLI (clack prompter) and remote clients via `WizardSession` step/answer protocol (`src/wizard/session.ts`) exposed as Gateway RPC `wizard.start|next|cancel|status`. Secret prefill stripped before crossing client boundary. Busy setup returns `SETUP_ADMISSION_BUSY`.
- i18n of fixed copy (`OPENCLAW_LOCALE` > `LC_ALL` > `LC_MESSAGES` > `LANG`); identifiers stay English.
- Masked secret input; device-code anti-phishing warning text.

### Non-interactive / automation
- Same command with flags: `--auth-choice`, provider key flags, `--secret-input-mode plaintext|ref`, `--install-daemon|--skip-daemon|--skip-health`, `--skip-bootstrap|--skip-skills|...`, `--json` summary (does not imply non-interactive).
- Third-party plugin capabilities cannot be accepted non-interactively; must preinstall with `--accept-capabilities`.

## Layer 3: Gateway service
- `openclaw gateway install`: LaunchAgent (macOS), systemd user unit (Linux/WSL2), Scheduled Task with Startup-folder fallback (Windows). Validates SecretRef token without persisting it into service env.
- Health: `gateway status` (port 18789), `dashboard`, `doctor`, `triage` (sanitized diagnosis for a coding agent).

## Layer 4: Agent bootstrapping ritual (`docs/start/bootstrapping.md`)
- New workspace (`~/.openclaw/workspace`) seeded with `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `BOOTSTRAP.md`.
- On first real turn agent follows `BOOTSTRAP.md`: ask name, one vibe line + emoji, optional 4-avatar sheet, plugin recommendation choice. "User's request always comes first; ritual, not a gate."
- Self-terminating: `BOOTSTRAP.md` deleted once workspace "looks configured" (identity files diverge from template or `memory/` exists). `--skip-bootstrap` for pre-seeded workspaces.

### First-run state machine (user's actual focus, verified in code)
- State record per workspace: `bootstrapSeededAt`, `setupCompletedAt` (SQLite workspace setup store, `src/infra/state-migrations.workspace-setup-store.ts`).
- Seed (`ensure...` in `src/agents/workspace.ts:830-880`): if not seeded, not completed, and no `BOOTSTRAP.md` -> check user-content evidence first (identity files differ from template by content/sha256, `memory/`, `MEMORY.md`, `skills/*/SKILL.md`, pre-existing `.git`). Evidence -> mark `setupCompletedAt`, never write BOOTSTRAP. No evidence -> write template, mark `bootstrapSeededAt`.
- Pending = `!setupCompletedAt && BOOTSTRAP.md exists` (`workspace.ts:899`).
- Force-run: `resolveBootstrapMode` (`src/agents/bootstrap-mode.ts`) -> `full` only for primary, interactive, user-facing runs with file access; `limited` otherwise; `none` for cron/heartbeat. Full mode injects prompt lines (`src/agents/bootstrap-prompt.ts`): "Can finish BOOTSTRAP.md here: do it... Never claim completion early. No generic greeting before BOOTSTRAP.md handling."
- Completion (`reconcileWorkspaceBootstrapCompletionState`, `workspace.ts:338`): when profile looks configured -> write `setupCompletedAt` FIRST, then `fs.rm(BOOTSTRAP.md)` best-effort. "Completion state is authoritative; stale BOOTSTRAP cleanup is best-effort."
- Retired template hashes kept so a template update does not make an untouched seeded file look customized.

## Doctor (ongoing management)
- Structured contract `detect(ctx) -> HealthFinding[]`, optional `repair(ctx, findings)`; findings carry `checkId`, `severity`, `path`, `fixHint`. After repair, detect re-runs scoped to the finding; still present -> warning.
- `doctor --lint` (detect only), `--fix`, `--fix --dry-run` direction; owns legacy state migrations with durable receipts.

## Patterns applicable to the user's CLI
1. One required gate, proven live (for OpenClaw: a real completion). Everything else optional and skippable.
2. Detect existing capability read-only, let the user choose, never auto-fallback silently.
3. Stage -> verify -> commit config; failure leaves prior config intact.
4. Validate all flags and TTY before any destructive step; reset last; lock the state dir.
5. Three entry modes over one engine: guided default, classic/full, `--non-interactive --accept-risk` + `--json`.
6. Prompter interface separating flow logic from rendering (CLI now, RPC/GUI later).
7. Installer hands off with `exec </dev/tty`; upgrades route to `doctor --fix`, not onboarding.
8. Idempotent re-run = "verify and repair"; record wizard provenance in config.
9. Self-deleting bootstrap file for first-turn ritual.
10. Doctor as detect/repair contract with stable check IDs.

## Relevant Files
- `src/commands/onboard.ts` - preflight, reset, runner routing, lock
- `src/commands/onboard-guided.ts`, `onboard-interactive.ts`, `onboard-non-interactive.ts` (+ `onboard-non-interactive/`)
- `src/commands/onboard-inference.ts`, `onboard-inference-ambient.ts` - ambient backend detection
- `src/system-agent/setup-inference-*.ts` - verification turn, activation, transition
- `src/wizard/prompts.ts`, `src/wizard/session.ts`, `src/wizard/clack-prompter.ts`, `src/wizard/i18n/`
- `src/wizard/setup.*.ts` - workspace, gateway config, finalize, migration import
- `src/commands/setup.ts`, `src/commands/gateway-service-setup.ts`
- Docs: `docs/start/{onboarding-overview,wizard,wizard-cli-reference,wizard-cli-automation,bootstrapping}.md`, `docs/cli/{onboard,setup,doctor}.md`, `docs/cli/doctor/health-contract.md`, `docs/reference/templates/BOOTSTRAP.md`

## Unresolved Questions
- Setup receipt storage format/location not traced in code (only referenced in `setup.workspace.ts` and docs).
- `install.ps1` (Windows) not read.
- Scale warning: onboarding alone is ~24k LOC; much complexity comes from multi-provider auth, remote Gateway, migrations. A smaller CLI should copy the patterns, not the surface.
