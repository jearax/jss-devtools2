---
title: Cooked the TUI framework
date: 2026-10-20
summary: "Shipped the core/ui terminal layer behind @clack/prompts, with a plain-line fallback for piped and CI runs, a CliError with a hint, and the animated spinner drawn by the layer after the review found clack's spinner swallows failures"
---

# Cooked the TUI framework

## What happened
The TUI research report
([researcher-261020-0023-tui-framework.md](../reports/researcher-261020-0023-tui-framework.md))
decided to keep `@clack/prompts` behind a `core/ui` layer that owns the non-TTY cases. This cook
shipped that layer: `src/core/ui/terminal.ui.ts`, the `CliError` it renders, the exit codes, and the
wiring in `src/cli.ts`. A review
([code-reviewer-261020-0045-tui-layer-review.md](../reports/code-reviewer-261020-0045-tui-layer-review.md))
found a blocker in the animated path, and the layer changed because of it.

## Findings
- **Clack's spinner turns a failure into exit 0.** `spinner.start()` registers five global process
  handlers while the work runs, and the `unhandledRejection` one suppresses Node's default crash.
  Measured with the same task and only the branch differing: the interactive branch swallowed a
  detached rejection and ended with exit 0, the piped branch crashed with exit 1. The `SIGINT`
  handler has the same shape: Ctrl+C printed "Canceled" and the CLI carried on, so a cancelled run
  ended as a success. The architecture rule cannot see it, because the handler is registered by the
  library, not by our source.
- **So the layer draws its own frames.** `src/core/ui/animated-spinner.ui.ts` replaces clack's
  spinner: no global handlers, no hidden cursor, and Ctrl+C ends the CLI the way it ends any other
  program. The frames and the colours are clack's, so the look did not change. The layer now owns
  no process state at all.
- **Clack's own task runner hangs on a failed task.** `tasks()` starts a spinner, awaits the task
  and only then stops the spinner, so a task that throws leaves the interval running: the process
  never exits. `runTasks` stops the spinner itself before it re-throws.
- **The bundle grew 7.4 kB, not 35 kB.** `dist/cli.mjs` went from 103 kB to 110.4 kB (27.28 kB
  gzipped), because only `log` and the glyph constants are imported and the prompts tree-shake out.
  The research measured 35 kB for a sample that used the whole library.
- **The layer behaves as measured.** Piped: 0 escape bytes, plain `◇`/`◆` lines. Under a pty
  (`script -q /dev/null`): 32 escape bytes, cursor codes, colours, the animated path. A detached
  rejection during the animation ends the CLI with exit 1, and Ctrl+C kills it with SIGINT.
- **The local Node was 24.21.0**, not the floor. Node 22.22.1 was installed with nvm and every check
  ran there.

## Decision
One rule, `isInteractive()`: stdout is a terminal and no CI marker is set. The animated primitives
fall back to plain lines everywhere else, and the prompt guard still waits for the first prompt,
because a clack prompt on a closed stdin never settles (bombshell-dev/clack#615).

## Also
- The tests caught a real defect during the refactor: the rewritten `runTasks` had dropped the
  `start` call, so no task title was printed. The suite failed before the code shipped.
- A second review
  ([code-reviewer-261020-0105-tui-layer-review.md](../reports/code-reviewer-261020-0105-tui-layer-review.md))
  caught what the byte-level checks could not: a cursor up of zero still moves up one line, so
  every frame erased the line above it, and a one-second task wiped the banner and the earlier
  results. The erase now writes the cursor up only when the frame wrapped, and a test pins it.
- A pty without a window size reported zero columns, which turned the erase sequence into
  `ESC[InfinityA`. The width now falls back to 80.
- The failed task line names the task, not the reason: the message belongs to the error path on
  stderr, so it never lands on stdout.
- `runProgram(program, argv)` is new in `src/cli.ts`, and `main` delegates to it, so a test can run
  a program that throws a `CliError` and assert the exit code and the hint on stderr. It also
  registers the unknown-command fallback, so both entry points behave the same.
- The capture helper moved from `tests/cli.test.ts` to `tests/support/capture-stream.ts`, where two
  suites use it.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
