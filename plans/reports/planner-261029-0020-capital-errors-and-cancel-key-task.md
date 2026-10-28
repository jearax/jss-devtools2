# Task: capital first line in every error, `<project-name>`, cancel key in the footer

For the cooker, 2026-10-29. Decided by the user (decision log, "Capital first line, placeholder and
cancel key"). Builds on the error format just committed (`b975c78`).

## 1. First line of every error

Only the first line changes; labels, commands and hints stay as they are.

| # | Now | New |
|---|---|---|
| E1 | `<dir> is not empty` | `Folder <dir> is not empty` |
| E2 | `<dir> is a file` | `A file named <dir> already exists` |
| E3 | `git is not installed` | `Git is not installed` (in `git.adapter.ts`, shared with doctor) |
| E4 | `<pm> is not installed` | `Package manager <pm> is not installed` |
| E5 | `this project uses <pm>, which is not installed` | `This project uses <pm>, which is not installed` |
| E6 | `yarn <v> is not supported, only yarn 1` | `Only yarn 1 is supported, found yarn <v>` |
| E7 | `<agent> is not supported` | `Package manager <agent> is not supported` |
| E8 | `no package.json here` | `No package.json here` |
| E9 | `package.json is not valid JSON: <parser message>` | `Invalid JSON in package.json: <parser message>` |
| E10 | `monorepos are not supported yet` | `Monorepos are not supported yet` |
| E11 | `no tsconfig.json here` | `No tsconfig.json here` |
| E12 | `not a git repository` | `Not a git repository` |
| E13 | `this is not the git root` | `This is not the git root` |
| E14 | `git hooks are managed by <path> (core.hooksPath)` | `Git hooks are managed by <path> (core.hooksPath)` |
| E15 | `pnpm-workspace.yaml cannot be extended line by line` | `Cannot extend pnpm-workspace.yaml line by line` |
| E16 | `already set up: <list>` | `Already set up: <list>` |
| E17 | `<folder> cannot be a package name` | `Not a valid package name: <folder>` |
| E18 | `git init failed in <dir>` | `Could not run git init in <dir>` |
| E19 | `<name> is not supported yet` | `Framework <name> is not supported yet` |
| E20 | `--pm needs <dir>` | `Option --pm needs <dir>` |
| E21 | `--force is for an existing project` | `Option --force is for an existing project` |
| E22 | `not a terminal` | `Not a terminal` |
| E23 | `cancelled, nothing written` | `Cancelled, nothing written` (every place that throws it, Ctrl+C and Esc included) |
| E24 | `install failed; the files are written` | `Install failed; the files are written` |
| E25 | `<bin> failed; the files are written` | `Could not sort package.json with <bin>; the files are written` |
| E26 | doctor `<n> of <m> checks failed` | unchanged (starts with a digit) |

If any other exit 1 message exists that this table misses, list it in your reply instead of
inventing wording.

Commander's own errors: today `init --bogus` prints `Error: unknown option '--bogus'` and `nope`
prints `error: unknown command 'nope'`. Make every commander error start with a capital letter,
words unchanged, through commander's own output hook (`configureOutput`) in `src/cli.ts`, set once
on the root program before the subcommands attach so they inherit it. Keep the exit code commander
uses today (non-zero).

## 2. Placeholder

`jss-devtools init <name>` in E8 and E11 becomes `jss-devtools init <project-name>`. Check the docs
and tests for other `<name>` placeholders in suggested commands; `--framework <name>` and
`--pm <name>` in help are option argument names, not this, and stay.

## 3. Cancel key in the package manager question

The select footer reads `↑/↓ to navigate • Enter: confirm • Esc/Ctrl+C: cancel`, the key part dim
like the other two. Clack 1.8.1 renders the footer from its exported `SELECT_INSTRUCTIONS` array at
render time and has no option for custom text (only `showInstructions`), so append one entry to that
array once, in `src/core/ui/terminal.ui.ts`. That mutation is the trap a reader would undo: one
comment line saying clack has no option for it is allowed. Add a test that renders the select footer
(or reads the array after the module loads) and asserts the three parts, so a clack upgrade that
changes this fails a test.

## Tests and docs

- Every row of part 1: the exact first line (update `tests/error-output.test.ts` and the others).
- `init --bogus` and an unknown command: first letter capital, exit code non-zero as today.
- Update every doc that quotes an old first line or `<name>` (grep `docs`, `README.md`). The decision
  log and the message review are the planner's; do not edit them.

## Comments

Default zero comments; the one allowed in part 3. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. If a hook blocks running the
built bundle, skip that and say so. No commit; reply with the Status block, a short summary and the
files changed.
