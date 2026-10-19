# Research: TUI framework for jss-devtools

Conducted 2026-10-20, by measurement: every library was installed at its latest version, bundled
the way this repo ships (one ESM file, every dependency inlined), run with no `node_modules`
beside it, and run with stdout piped and with stdin closed.

## Outcome

**Keep `@clack/prompts` 1.8.1 (decision 0004), behind a small `core/ui` layer that owns the
non-TTY cases.** It is the only candidate that covers banner-adjacent output, logs, spinner, tasks,
streamed task logs, progress and prompts in one 18 KB library with one look. Its two real defects,
ANSI codes when piped and prompts that never settle when stdin ends, are both outside-the-TTY cases
that a thin wrapper handles. No candidate removes the need for that wrapper except listr2, and only
for tasks, at ten times the size.

## Contents

1. [Candidates](#candidates)
2. [Measurements](#measurements)
3. [Findings that decide it](#findings-that-decide-it)
4. [The core/ui contract](#the-coreui-contract)
5. [Next steps](#next-steps)
6. [Unresolved questions](#unresolved-questions)

## Candidates

From the npm registry, 2026-10-20:

| Package | Latest | Released | Weekly downloads | Covers | Status |
|---|---|---|---|---|---|
| `@clack/prompts` | 1.8.1 | 2026-09-13 | 18.4 M | intro/outro, log, spinner, tasks, taskLog, progress, box, all prompts | active (pushed 2026-10-15), MIT |
| `@inquirer/prompts` | 8.7.3 | 2026-10-04 | 24.9 M | prompts only | active (2026-10-15), MIT |
| `listr2` | 11.4.0 | 2026-10-17 | 23.0 M | task lists only (prompts through an adapter) | active (2026-10-19), MIT |
| `ora` | 9.4.1 | 2026-06-22 | 55.2 M | spinner only | active, MIT |
| `ink` + `react` | 8.0.0 + 19.3.1 | 2026-10-03 | 4.8 M | full React renderer | active, MIT |
| `enquirer` | 2.4.1 | 2023-07-28 | 20.8 M | prompts | **dropped**: no release in over three years |
| `prompts` | 2.4.2 | 2021-10-07 | 39.1 M | prompts | **dropped**: no release in five years |

`consola` (logger with clack-style prompts) and `@topcli/prompts` were noted but not measured: the
first duplicates clack's output role, the second has 0.24 M weekly downloads.

## Measurements

Bundled with esbuild 0.25.10, `--platform=node --format=esm --target=node22`, a minimal sample per
library. The repo's own bundle (`dist/cli.mjs`, tsdown, not minified) is 103 KB today.

| Library | Inlined | Minified | Gzip | Runs with no `node_modules` | ESC bytes, stdout piped | ESC bytes, `CI=true` |
|---|---|---|---|---|---|---|
| clack (intro, spinner, log, outro) | 35 KB | 18 KB | 7 KB | yes | 6 | 4 |
| clack `tasks` + `taskLog` | | | | yes | 22 | |
| @inquirer/prompts (confirm) | 51 KB | 24 KB | 9 KB | yes | 0 | 0 |
| listr2 (two tasks) | 170 KB | 75 KB | 24 KB | yes | 0 | 0 |
| ora (one spinner) | 100 KB | 58 KB | 15 KB | yes | 2 | 0 |
| ink + react (two `Text`) | 1,722 KB | 666 KB | 215 KB | **no**: fails on `react-devtools-core` | | |

Prompt with stdin closed (`< /dev/null`), the CI and agent-shell case:

| Library | Behavior |
|---|---|
| clack `confirm` | never settles; Node exits **13** ("Detected unsettled top-level await"), no message, cursor left hidden |
| inquirer `confirm` | throws `ExitPromptError` ("User force closed the prompt"), catchable |

## Findings that decide it

- **Ink is out.** Its bundle is seventeen times the whole CLI, and it does not run standalone
  without stubbing `react-devtools-core`. A React renderer buys layout this CLI does not need.
- **enquirer and prompts are out**: unmaintained.
- **The clack stdin hang is a known, open bug**: bombshell-dev/clack#615 "Prompts never settle when
  stdin ends" (opened 2026-10-13, 1.8.1 and main). Exit 13 is non-zero, so the repo's "failures stay
  non-zero" rule holds, but the user gets no explanation. The fix on our side is cheap: never call a
  prompt unless stdin and stdout are TTYs, and fail with a `CliError` that names the flag to pass
  instead (for example `--yes`).
- **Clack writes cursor codes when piped**, in `spinner`, `tasks` and `taskLog`. `log.*`, `intro`,
  `outro` and `note` are plain glyphs. So `core/ui` renders spinners and tasks as clack on a TTY
  and as plain `log.step`/`log.success`/`log.error` lines otherwise.
- **listr2 is the only library with a correct non-TTY fallback built in**, but it covers tasks only,
  costs 170 KB inlined, and brings a second visual style. Not worth it while clack's `tasks` plus a
  fallback covers `init`; revisit only if `init` needs concurrent tasks with nested output.
- **inquirer's closed-stdin behavior is better than clack's**, but mixing it in means two prompt
  styles. The TTY guard removes the case where the difference shows.

## The core/ui contract

```
src/core/ui/
├─ banner.ui.ts      banner (plan 261020-0023-cli-banner)
└─ terminal.ui.ts    the only clack wrapper commands use for anything that animates or asks
```

| Primitive | On a TTY outside CI | Piped, captured or CI |
|---|---|---|
| spinner | clack `spinner` | `log.step` at start, `log.success`/`log.error` at the end |
| tasks | clack `tasks` / `taskLog` | one `log.step` per task, result line after |
| prompt | clack prompt; `isCancel` maps to `CliError` exit 1 | not called: `CliError` naming the non-interactive flag |
| logs, intro, outro, note | clack directly | clack directly (plain glyphs, no cursor codes) |
| errors | `log.error(…, { output: process.stderr })` | same |

Commands may still import clack for the plain primitives, as the approved rule allows; the
animated and interactive ones go through `terminal.ui.ts` so the guard cannot be forgotten.

**Shipped differently (2026-10-20).** The layer and its fallbacks shipped as planned, with one
change: the animated spinner is drawn by `src/core/ui/animated-spinner.ui.ts` and not by clack.
Clack's spinner registers global process handlers while it runs, and its `unhandledRejection`
handler turns a detached rejection into exit 0, while its `SIGINT` handler makes Ctrl+C print
"Canceled" and carry on. Measured, with only the branch differing. The finding is in
[the review](code-reviewer-261020-0045-tui-layer-review.md) and the reasoning in
[decision 0004](../../docs/decisions/0004-cli-parser-and-prompts.md). The frames and the colours
are clack's, so the look did not change.

## Next steps

1. Keep decision 0004; record this research in its "Later" note in the core layout plan's docs
   phase.
2. Core layout plan, phase 1: `terminal.ui.ts` ships the spinner and tasks fallbacks now, with a
   test that piped output has no ESC byte. The prompt guard ships with the first prompt (the
   toolchain `init` plan), with a test that closed stdin exits 1 with a hint, not 13.
3. Watch clack#615; when it is fixed, the guard stays anyway, because CI must never wait on a
   prompt.

## Unresolved questions

- Which flag names the non-interactive path for `init` (`--yes`, `--defaults`)? Belongs to T4.
- Does `init` need concurrent tasks? If yes, listr2 is reconsidered then, not now.

## Sources

- npm registry metadata for every package above (`npm view <pkg> version time license dependencies`,
  `api.npmjs.org/downloads/point/last-week`), read 2026-10-20.
- GitHub repository metadata (`gh api repos/…`): bombshell-dev/clack, SBoudrias/Inquirer.js,
  listr2/listr2, sindresorhus/ora, vadimdemedes/ink.
- bombshell-dev/clack#615, https://github.com/bombshell-dev/clack/issues/615
- Local probes: minimal samples bundled with esbuild in the session scratchpad; the samples were not
  kept, the tables above record their results.
