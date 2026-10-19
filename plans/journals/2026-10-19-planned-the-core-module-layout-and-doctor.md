---
title: Planned the core module layout and doctor
date: 2026-10-19
summary: "NestJS-style modules with role suffixes, seven tested import rules, exit codes 0/1 with CliError, doctor as the first command"
---

# Planned the core module layout and doctor

## What happened
Planned `plans/261020-0017-core-module-layout/` (3 phases). Read H0's 20 decisions and source layout
and JSS's layout first; neither had import boundaries under test.

## Decisions (user)
- X1: exit codes 0/1, with a `CliError` carrying `exitCode` and `hint`; new codes only when a command
  needs one.
- File organisation NestJS style, "src/core/utils/abc.util.ts": one folder per feature module, role
  suffixes (command, service, check, adapter, util, constant, error, type), folder matches suffix.
- First command: `doctor` with three checks.
- Layout and rules approved, carrying over H0 0010 (one adapter per external tool).

## Findings
- Only H0 0009 (exit codes) and 0010 (adapters) touch core; 0011 and 0012 are superseded here; the
  other sixteen belong to the toolchain and harness plans, so X2 is answered for core only.
- The scanner must judge fixtures by a mirrored logical path, and import fixtures need real targets
  because `tsconfig.json` includes `tests/`.
- `docs/project-overview-pdr.md` still says the install site is a non-goal; stale, fixed in phase 3.

## Next steps
`/ak:cook plans/261020-0017-core-module-layout/plan.md`. A push to main deploys the new CLI.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.

## Amendment
The user expected the TUI framework in use from the first command: "kể cả placeholder thì đã bắt
đầu dùng framework TUI rồi chứ ta!". The plan had listed `@clack/prompts` as a non-goal; it now adds
`core/ui/terminal.ui.ts` and renders doctor through clack. A probe showed clack 1.8.1's spinner writes
ANSI cursor sequences even when piped, so the spinner runs only on a TTY outside CI, and errors go to
stderr through `log.error`'s `output` option.

The user also asked for a banner, "không phải text terminal thuần", choosing `JSS` in ANSI Shadow
with an info column, and pointed at the old JSS banner. It ran figlet at runtime and printed on
`--version`; here the art is a committed constant (the bundle has no `node_modules`) and `--version`
stays bare because `install.sh` validates it. `styleText` strips colors when piped on 22.22.1.

The user then split the banner out: "Chỗ banner, plan rồi riêng chỗ doctor đi", to be cooked by
another agent and amended into `8684998`. It is now `plans/261020-0023-cli-banner/` (root help only,
since no command exists yet), and the core layout plan is blocked by it and only adds `showBanner()`
for doctor.
