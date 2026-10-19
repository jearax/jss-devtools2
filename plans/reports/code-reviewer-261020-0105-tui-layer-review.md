# Review: TUI layer (uncommitted, on top of 8684998)

Scope: `src/core/{constants,errors,ui,utils}/`, `src/cli.ts`, `tests/terminal-ui.test.ts`,
`tests/cli.test.ts`, `tests/support/capture-stream.ts`, docs and plan edits. Everything below was
re-run by the reviewer.

## What was cooked

The `core/ui` layer and the error type from phase 1 of
`plans/261020-0017-core-module-layout/` (five steps checked there). **The banner plan
`plans/261020-0023-cli-banner/` was not cooked**: no `banner.constant.ts`, no `banner.ui.ts`, no
help or `--version` hook. Nothing is committed or amended yet.

## Verified green

- Node 22.22.1: `pnpm lint`, `typecheck`, `test` (5 files, 41 tests), `build` (110.40 kB, 27.28 kB
  gzip), `format:check` all green.
- The cook's central claim holds: `@clack/prompts` 1.8.1 `index.mjs` registers `exit`, `SIGINT`,
  `SIGTERM`, `uncaughtExceptionMonitor` and `unhandledRejection` handlers in its spinner. Drawing
  the frames in-house is justified by the repo's own "failures stay non-zero" rule.

## Findings

### 1. High: the animated spinner erases the lines above it, one per frame

`erase()` in `animated-spinner.ui.ts` (line 39 at review time; the file was still being edited)
computes `lines` and always writes `ESC[${lines - 1}A`. For a message
that fits one line, that is `ESC[0A`, and a Cursor Up parameter of 0 means 1 (ECMA-48; xterm
behaves the same). Every frame, 80 ms apart, moves up one more line and erases to the end of the
screen.

Replayed the exact byte sequence (two earlier lines, `start`, three frames, `success`) in
`@xterm/headless` 5.5.0, 80 columns:

| As written (`ESC[0A`) | Control (no cursor-up) |
|---|---|
| `◇  installed` alone; both earlier lines and the bar are gone | `previous output line A`, `previous output line B`, `│`, `◇  installed` |

A one-second task wipes about twelve lines: the banner, earlier task results, anything. The tests
only count escape bytes under a fake TTY, so they pass. Fix: emit cursor-up only when
`lines > 1`, and add a test that a one-line spinner's output contains no `\u001b[0A` (or render it
through a headless terminal).

### 2. Low: `update()` changes the message the next erase measures

`erase()` sizes the drawn frame from the current `message`; after `update()` with a message of a
different wrapped height, the next erase moves by the new height, not the drawn one. Track the
drawn text's line count instead. Same area: `message.length` counts code units, not columns, so
CJK or emoji messages miscount; acceptable for now, worth a comment.

### 3. Low: decision 0004 is stricter than the approved rule

0004 now says "the library itself stays behind that layer, so a command never renders on its own".
The approved rule (`clack-in-ui-layer-only`) lets `*.command.ts` import clack for plain primitives,
and the research report says so too. One of them has to change before the architecture rules land;
the plan's rule is the user-approved one. 0004's "Later" also lists "the banner" among clack's
coverage; the banner is `node:util` `styleText`, not clack.

## Not defects

- `createSpinner`, `runTasks` and `isInteractive` have no caller yet; the doctor phase is their
  first. Shipping them with phase 1 is what the plan says.
- `isInteractive` treats `CI=0` and `CI=false` as not-CI. Reasonable.

## Resolution (2026-10-20, re-review through Herdr)

- Finding 1 fixed: `drawFrame` records `drawnLines` from the frame it drew, and `erase()` writes a
  cursor-up only when `drawnLines > 1`. Replayed the real module in `@xterm/headless` 5.5.0 at 80
  columns, with two earlier lines, `start`, an `update()` that wraps to two lines, one back to one
  line, then `success`: the screen keeps `previous output line A/B`, `│`, `◇  installed`. Frames of
  exactly 80 and 160 columns (pending-wrap) also keep every earlier line. No `ESC[0A` written.
- Finding 2 fixed by the same change: erase uses the drawn height, not the current message. The
  code-unit width limit stays, with a comment.
- Finding 3 fixed: 0004 now lets a command use the plain primitives directly, and no longer lists
  the banner under clack.
- Nit raised on re-review and fixed: `AnimatedSpinner` duplicated `TerminalSpinner`; one type now,
  imported with `import type`, so no runtime cycle.
- Gate re-run by the reviewer on Node 22.22.1: lint, typecheck, test (5 files, 42 tests), build
  (110.24 kB, 27.21 kB gzip), format:check, all green. Nothing committed.

## Unresolved questions

- Should the banner plan still be cooked and amended into `8684998` together with this layer, or
  as its own step?
