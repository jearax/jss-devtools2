---
phase: 1
title: "Coloured plan, install and sort steps"
status: done
priority: P2
effort: "4h"
dependencies: []
---

# Phase 1: Coloured plan, install and sort steps

## Goal

The terminal output of `init` matches the approved mockup; the piped output keeps the same lines
in plain text.

## Target output

Terminal, create mode (colours in brackets):

```text
┌   jss-devtools init
│
◇  my-app: 13 to create                      ← "13 to create" [green]
│  + package.json                            ← "+" [green]
│  + src/main.ts                             ← "src/" [dim]
│  …
│
◇  Installed with npm (13.1s)                ← "(13.1s)" [dim]
│
◇  Sorted package.json
│
└  next: cd my-app, npm run dev
```

While the install runs, in a terminal:

```text
◒  Installing with npm
│  added 248 packages, and audited 249 packages in 12s     ← last 5 lines, [dim]
│  …
```

Existing mode with `-f`: the heading is `demo: 9 to create, 2 to update, 1 to delete`, with
`to update` and `~` yellow, `to delete` and `-` red. A count of zero is left out.

Piped or `CI=1`: the same step lines and icons, no colour, and between `Installing with npm` and
`Installed with npm (13.1s)` every line the package manager prints, each prefixed with `│  `.

Dry run: the heading and list as above, then the outro `Dry run: nothing written` (the count now
lives in the heading).

## Requirements

1. **Plan list** (`renderPlan`, `src/commands/init/plan.service.ts`): marks coloured `+` green,
   `~` yellow, `-` red; the folder part of a path (up to the last `/`) dim. The heading is one
   `log.step` line before the list: `<projectName>: <counts>`, counts in the order create, update,
   delete, each in its mark's colour, joined with `, `, zero counts omitted. Colour goes through
   `node:util` `styleText`, which already drops colour when stdout is not a terminal or `NO_COLOR`
   is set; check that it really does for this call path.
2. **Install**: replace `inheritStdio` for the install with output captured line by line (stdout and
   stderr, split on `\n`, `\r\n` and `\r`, empty lines dropped). Extend `runCommand` in
   `src/core/utils/run-command.util.ts` with an `onLine` callback rather than adding a second runner;
   keep the `ENOENT` → `null` contract.
3. **Task log** in `src/core/ui/terminal.ui.ts`, next to `createSpinner`, the same split:
   - interactive (`isInteractive()`): clack `taskLog({ title, limit: 5, retainLog: true })`; success
     prints `Installed with <pm> (<seconds>s)` with the time dim, one decimal; failure calls
     `error(title)` so the full log stays, and the existing install error follows on stderr.
   - not interactive: `log.step(title)`, each line written as `│  <line>` with no styling,
     `log.step('Installed with <pm> (<seconds>s)')` on success, `log.error(title)` on failure.
   Clack 1.8.1 `taskLog` writes cursor codes even when piped (probed 2026-10-28), so it must never
   run outside a terminal.
4. **Sort**: wrap `sortPackageJson` as a step: a success line `Sorted package.json`; on failure the
   existing `sortFailureMessage` error, unchanged. Reuse `runTasks` / `createSpinner` if it fits.
5. **Dry-run outro**: `Dry run: nothing written`.

Keep the order of the flow, every exit code, every other message and the confirm prompt as they are.

## Files

- `src/commands/init/plan.service.ts` (render), `src/commands/init/init.command.ts` (heading, steps,
  dry-run outro)
- `src/core/utils/run-command.util.ts`, `src/core/adapters/package-manager.adapter.ts`
- `src/core/ui/terminal.ui.ts`
- tests next to each; `docs/system-architecture.md` or `docs/codebase-summary.md` if they describe
  the install output or the terminal layer
- Respect `tests/support/architecture-rules.ts`: core does not import commander; only `src/cli.ts`
  touches process exit.

## Tests

- `renderPlan` and the heading: forced colour shows the right colour per mark and dim folders;
  unforced output has no `\x1b`; zero counts are omitted.
- The non-interactive task log: exact lines, prefix `│  `, no `\x1b`, success and failure.
- `runCommand` with `onLine`: lines from both streams, `\r` split, exit code and `ENOENT`.
- `init` with a stub install that prints lines and exits 0 or 1, piped: the lines appear between the
  step lines; exit 0 or today's install error with exit 1.
- The existing dry-run test asserts the new outro.

## Verification

1. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` on Node 24.11.0, real output.
2. Paste the piped output of `node dist/cli.mjs init my-app --pm bun -y` in a temp folder, and of
   `init my-app --pm npm -y` with `npm_config_registry=http://127.0.0.1:9` (install failure).
3. No comments that restate the code.

The planner then checks the terminal rendering in a pty and reruns the 63-case matrix.

## Risk

- Some package managers print progress with `\r`; splitting on it may show partial lines. Accept,
  the log is dim and short.
- A package manager that detects a non-terminal stdout prints less than before (no progress bar).
  This is the point of the captured mode; the CI log still holds every line it prints.
