# Task: every exit 1 message as problem, commands or hint

For the cooker, 2026-10-28. Decided by the user (decision log, "Error output (exit 1)").

## Format

```text
│                                 │                                  │
└  e1 is not empty                └  bun is not installed            └  monorepos are not supported yet
   To set it up instead:             ↳ Install bun, then rerun
     $ cd e1
     $ jss-devtools init
```

1. First line, red as today: what is wrong; no action, no `;` tail.
2. Commands: `CliError`'s existing `commands`, rendered by the existing `nextStepBlock`, now with a
   label per error (today it is fixed to `To finish`). Give `CliError` a label next to `commands`;
   `To finish` stays for the two after-write errors.
3. Hint: `CliError`'s existing `hint`, rendered as today (`   ↳ <hint>`, yellow), always starting
   with a capital letter.
4. When an error has both commands and a hint (E16 only), print the commands block, then the hint.
   `renderError` today prints one or the other; change that.

stderr only, exit 1 as today; no escape codes when piped, with `CI=1` or `NO_COLOR`.

## Every error

`<x>` is filled in at run time. `cd` targets and folder names go through `shellQuote` as today.

| # | When | First line | Commands (label: lines) or hint |
|---|---|---|---|
| E1 | `<dir>` is not empty | `<dir> is not empty` | To set it up instead: `cd <dir>`, `jss-devtools init` |
| E2 | `<dir>` is a file | `<dir> is a file` | ↳ Pick another name |
| E3 | git missing | `git is not installed` | ↳ Install git, then rerun |
| E4 | `--pm` manager missing (create) | `<pm> is not installed` | ↳ Install it, or pick another with --pm |
| E5 | detected manager missing (existing) | `this project uses <pm>, which is not installed` | ↳ Install <pm>, then rerun |
| E6 | yarn 2+ for create | `yarn <v> is not supported, only yarn 1` | ↳ Pick another with --pm |
| E7 | detected manager unsupported | `<agent> is not supported` | ↳ Supported: bun, pnpm, yarn 1, npm (from `SUPPORTED_LIST`) |
| E8 | no package.json | `no package.json here` | To create a project: `jss-devtools init <name>` |
| E9 | package.json is not JSON | `package.json is not valid JSON: <parser message>` | ↳ Fix it, then rerun |
| E10 | monorepo | `monorepos are not supported yet` | none |
| E11 | no tsconfig.json | `no tsconfig.json here` | To create a new project instead: `jss-devtools init <name>` |
| E12 | not a git repository | `not a git repository` | To set one up: `git init` |
| E13 | run below the git root | `this is not the git root` | To run it there: `cd <relative root>`, `jss-devtools init` |
| E14 | other core.hooksPath | `git hooks are managed by <path> (core.hooksPath)` | To use husky: `git config --unset core.hooksPath` |
| E15 | pnpm-workspace.yaml flow style | `pnpm-workspace.yaml cannot be extended line by line` | ↳ Add esbuild: true and unrs-resolver: true under allowBuilds, then rerun |
| E16 | owned configs exist | `already set up: <list>` | To replace them: `jss-devtools init --force`; and, only when the list holds a `.vscode/` file, ↳ --no-vscode keeps .vscode/ as it is |
| E17 | no valid package name | `<folder> cannot be a package name` | ↳ Use a folder name with Latin letters or digits |
| E18 | git init failed | `git init failed in <dir>` | To see why: `cd <dir>`, `git init` |
| E19 | `--framework` not node | `<name> is not supported yet` | ↳ Only node is |
| E20 | `--pm` without `<dir>` | `--pm needs <dir>` | ↳ An existing project uses the manager it has |
| E21 | `-f` with `<dir>` | `--force is for an existing project` | ↳ Drop it when creating one |
| E22 | not a terminal, no `-y` | `not a terminal` | ↳ Run it in a terminal, or pass --yes |
| E23 | cancelled | `cancelled, nothing written` | none |
| E24 | install failed | unchanged | unchanged (`To finish:`) |
| E25 | package.json sort failed | unchanged | unchanged (`To finish:`) |
| E26 | doctor, a check failed | unchanged | unchanged |

E16's hint has no capital to add: it starts with the flag. E2 is new: today a file target falls into
E1 with a hint that cannot work; detect a file before the emptiness check. E3 comes from
`git.adapter.ts` (`problem`), shared with doctor: keep the first line there, add the hint where init
throws.

Doctor's three hints keep their words and gain the capital: `Install git, then run the command
again`, `Run \`git init\`, or cd into a repository`, `Install Node <floor> or newer`.

## Tests and docs

- One test per row above: exit 1, the exact stderr lines, piped so no `\x1b`.
- E16 with and without a `.vscode/` file in the list.
- Update every test and doc that quotes an old message (grep `src`, `tests`, `docs`, `README.md`). The
  decision log and the message review are the planner's; do not edit them.

## Comments

Default zero comments; one line only for a trap a reader would otherwise break. No JSDoc that says
what something is or does. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. If a hook blocks running the
built bundle, skip that and say so. No commit; reply with the Status block, a short summary and the
files changed.
