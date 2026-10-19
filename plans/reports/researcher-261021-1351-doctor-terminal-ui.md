# Research: a better-looking `doctor` output

Conducted 2026-10-21 on Node 22.22.1 with the repo's pinned `@clack/prompts` 1.8.1. Prototypes ran
on a pty (`script -q /dev/null`) and piped. It builds on
[researcher-261020-0023-tui-framework.md](./researcher-261020-0023-tui-framework.md), which
measured clack, inquirer, listr2, ora and ink, and is not repeated here.

## Outcome

**Keep clack. Change the layout, not the library.** The current output looks bad because of how
doctor uses clack, not because of clack:

- every line is a separate `log.*` call, and each call adds a blank `│` line before it;
- success shows as `◆`, which reads as "info", not "pass";
- a spinner that finishes in milliseconds leaves a "The checks are done" line;
- the rows show internal ids (`git.repository`) instead of labels;
- the fix hint is a separate `●` row, not attached to the check it fixes.

Layout A below fixes all five without adding any library. It uses one `log.message(lines, { spacing: 0 })`,
`✔`/`✖` coloured with `node:util` `styleText`, aligned labels, and the hint nested under its row.

## Options

| Option | Bundle cost | Looks | Risk | Verdict |
|---|---|---|---|---|
| A. clack, compact block | 0 | Clean, matches banner/intro of the rest of the CLI | None found | **Recommended** |
| B. Flutter-style plain lines (`[✓]`, `[✗]`, `•`, `!`) | 0 | Familiar from `flutter doctor` | Breaks the one look the other commands have | Fallback if clack's gutter is unwanted |
| C. clack `note` / `box` around a table | 0 | Best in a sized terminal | **Breaks when the terminal reports 0 columns** (measured, below) | Only with a width guard |
| listr2 task list | ~24 KB gzip (prior measurement) | Good for long tasks | Checks take milliseconds; a task list adds motion, not information | No |
| ink + React | ~215 KB gzip; fails with no `node_modules` (prior measurement) | Anything | Does not run in this bundle | No |
| chalk / picocolors / boxen / cli-table3 | small each | Same as A | Duplicate `styleText` and `padEnd` | No |
| gum / Charm | Go binary | Very nice | Not bundleable into `cli.mjs` | No |

## Measurements

- `styleText` (Node 22.22.1): coloured on a pty; plain when piped; plain with `NO_COLOR=1` on a pty;
  coloured when piped with `FORCE_COLOR=1`. It covers the piped and `NO_COLOR` contracts by itself.
- Layout A piped: 0 escape bytes. It keeps the `┌ │ └` glyphs, the same as the current layer.
- Layout C on a pty with unknown size: `process.stdout.columns` is `0`, and clack's `note` wraps
  every character onto its own line, so the box becomes 140 rows. With `stty cols 80` it renders
  correctly. Agent shells, `docker run -t` and some CI pty runners report 0 columns. `log.message`
  does not wrap, so layout A is unaffected.

## Mockups (layout A)

Every check passes (stdout, exit 0):

```text
┌   jss-devtools doctor
│  ✔ Node.js         v24.11.0  needs >= 24.11.0
│  ✔ Git             2.55.0
│  ✔ Git repository  /Users/me/project
│
└  All 3 checks passed
```

One check fails (the rows go to stdout; the summary goes to stderr through `CliError`; exit 1):

```text
┌   jss-devtools doctor
│  ✔ Node.js         v24.11.0  needs >= 24.11.0
│  ✔ Git             2.55.0
│  ✖ Git repository  not inside a git repository
│    ↳ run `git init`, or cd into a repository
│
└  1 of 3 checks failed
```

Colours on a terminal:

- `✔` is green and `✖` is red;
- the failing detail is red;
- the `↳` hint is yellow;
- the requirement note is dim;
- the title is inverse.

Piped output shows the same text with no colour.

## Changes this implies

1. Each check gets a display `label` (`Node.js`, `Git`, `Git repository`); the `id` stays for tests.
2. Doctor drops the spinner: the checks finish in milliseconds.
3. The row renderer lives in `core/ui` (`clack-in-ui-layer-only`), as one function that takes
   rows. Doctor only maps results to rows.
4. The `core/ui` layer never uses `note`/`box` without a width guard: `columns || 80`.

## Next steps

1. User chose A (2026-10-21).
2. Plan the change, then the cooker implements it through Herdr. Tests:
   - the piped output equals the mockup text;
   - no escape byte when piped or with `NO_COLOR`;
   - the summary goes to stderr on failure.

## Sources

- Flutter `doctor.dart`, status boxes `[✓] [!] [✗]` and "No issues found!" / "Doctor found issues in N categories":
  https://flutter.googlesource.com/mirrors/flutter/+/46ce54db8838b72b1a1d360fd661e9f5c19acc74/packages/flutter_tools/lib/src/doctor.dart
- Expo doctor, "Running N checks on your project…" with per-check marks: https://zenn.dev/nr/articles/335051ea6ff457
- OpenClaw CLI output rules (styling only on a TTY, `--json`/`--plain`, `NO_COLOR`): https://docs2.openclaw.ai/cli
- `@clack/prompts` 1.8.1 `log.message` options `spacing`, `withGuide`, `symbol`: read from the installed package.

## Unresolved questions

- No source shows `openclaw doctor`'s own output, so it is not used as a reference.
