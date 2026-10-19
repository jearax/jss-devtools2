---
title: Researched the TUI framework
date: 2026-10-19
summary: "Measured clack, inquirer, listr2, ora and ink as inlined bundles; kept clack behind core/ui guards; banner extended to --version on a TTY"
---

# Researched the TUI framework

## What happened
The user delegated the TUI framework and asked for research. Every candidate was installed at its
latest version, bundled into one ESM file with dependencies inlined, run without `node_modules`,
run piped, and run with stdin closed. Report:
`plans/reports/researcher-261020-0023-tui-framework.md`.

## Findings
- ink 8 + react 19: 1.7 MB inlined and fails standalone on `react-devtools-core`. Out.
- enquirer (2023) and prompts (2021) are unmaintained. Out.
- clack: 35 KB inlined, everything in one library, but spinner, tasks and taskLog write cursor codes
  when piped, and a prompt on closed stdin never settles: exit 13, no message. Known as
  bombshell-dev/clack#615, open since 2026-10-13.
- inquirer throws a catchable `ExitPromptError` on closed stdin; listr2 has a clean non-TTY renderer
  but is tasks-only and 170 KB.

## Decision
Keep clack (decision 0004) behind `core/ui/terminal.ui.ts`: plain log lines instead of animation
outside a TTY, and no prompt without a TTY (guard ships with the first prompt).

## Also
The banner plan now shows the banner on `--version` too, TTY only, so `install.sh`'s captured
`--version` stays a bare `x.y.z`.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
