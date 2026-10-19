---
phase: 3
title: "Docs and decisions"
status: done
priority: P2
effort: "1h"
dependencies: [2]
---

# Phase 3: Docs and decisions

## Goal
The layout, the rules and the exit codes are recorded where agents look first, quoting the user.

## Files
- Create decision records, next numbers after 0022: exit codes 0/1 with `CliError` (X1); NestJS-style
  layout, one folder per command under `src/commands/`, with role suffixes and its rules, carrying over H0 0010's adapter rule (X2, core part).
- Decision 0004: a "Later" note that clack is now the rendering layer of every command, not only
  prompts, quoting the user (the banner note comes from the banner plan). The note about the TUI
  research of 2026-10-20 is already written, with the research on 2026-10-20: it kept clack over
  inquirer, listr2, ora and ink, with the reasons and clack#615.
- `docs/code-standards.md`: replace the naming section's file rules with the suffix table.
- `docs/system-architecture.md`: the layout, the rule table, the Node floor `define` in the facts table.
- `docs/codebase-summary.md`, `CLAUDE.md` ("Where things are": `src/core/`, `src/commands/`),
  `README.md` (`jss-devtools doctor` after install), `docs/project-roadmap.md` (core layout done).
- `docs/project-overview-pdr.md`: "Current stage" and "Non-goals" still say no install site and no
  product command; both are stale since the install site shipped.
- `plans/261019-1050-jss-devtools-rewrite/open-questions.md`: X1 answered; X2 answered for core,
  the remaining H0 decisions listed against the toolchain and harness plans.

## Verification
- Relative links resolve; `pnpm format:check` and `pnpm lint` green.
- Every rule named in the docs exists in `architecture-rules.ts`, and the reverse.

## Outcome

Done on 2026-10-21. The two decision records are
[0023](../../docs/decisions/0023-exit-codes.md) and
[0024](../../docs/decisions/0024-core-and-command-layout.md). The layout and the rule table are in
[system-architecture.md](../../docs/system-architecture.md), the suffix table is in
[code-standards.md](../../docs/code-standards.md), and the tree is in
[codebase-summary.md](../../docs/codebase-summary.md).

One thing the plan did not name: the decision record for the layout is
`0024-core-and-command-layout.md`, not `0024-core-module-layout.md`, because the folder is
`src/commands/`.
