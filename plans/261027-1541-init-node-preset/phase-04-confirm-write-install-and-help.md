---
phase: 4
title: "Confirmation, writes, install and help"
status: pending
priority: P1
effort: "5h"
dependencies: [3]
---

# Phase 4: Confirmation, writes, install and help

## Goal

Ask the two questions, write the plan, install, sort `package.json`, and render the decided `--help`.

## Questions

Only two, both through the UI layer (decision "Questions in create mode"):

| Question | Asked when | With `-y` |
|---|---|---|
| package manager (select npm, yarn, pnpm, bun) | create mode, no `--pm` | npm |
| "write N files to my-app and install?" after the plan is shown | always, unless `--dry-run` | yes |

Without `-y`, a question with no terminal on stdin or stdout, or with `CI` set, exits 1 "run it in a
terminal, or pass --yes" (decision 0029). Declining or Ctrl+C exits 1 "cancelled, nothing written".

## Writing, in order

```text
create:   mkdir <dir> -> gitInit -> write the plan -> install -> sort package.json -> outro
existing:                           write the plan -> install -> sort package.json -> outro
```

- Writes go through one function that applies the plan entries; deletions (`-f`) come last.
- Install: `<pm> install`, stdio inherited, so the manager's output reaches the user unfiltered.
  `prepare: husky` installs the hooks.
- Sort: `runLocalBin(pm, 'prettier-package-json', ['--write', 'package.json'])` then
  `runLocalBin(pm, 'prettier', ['--write', 'package.json'])`, in that order.
- Install fails: exit 1 "install failed; the files are written. To finish: cd my-app && npm install"
  (no `cd` in existing mode). Nothing is rolled back.
- Outro: the next steps, `cd my-app` and `<pm> run dev` in create mode. No commit is made.

## Help

`COMMON_OPTIONS` descriptions gain their defaults (they are shared, `doctor` does not attach them).
`init --help` renders exactly this (commander 15.0.0, rendered from the repo on 2026-10-27; recheck
after editing):

```text
Usage: jss-devtools init [options] [dir]

create a project, or set up the current one

Arguments:
  dir                 create a new project in this folder (missing or empty);
                      without it, set up the project in the current folder

Options:
  --framework <name>  the preset to apply; only node is built so far (choices:
                      "node", "react", "rn", "next", "nest", default: "node")
  --pm <name>         package manager for a new project; asked when omitted, npm
                      with --yes. Not accepted without <dir>: the current
                      folder's manager is detected (choices: "npm", "yarn",
                      "pnpm", "bun")
  -f, --force         replace the config files init owns when they already
                      exist, and delete their other names (default: off; init
                      stops and lists them)
  --no-vscode         do not write .vscode/ (default: written)
  -y, --yes           do not ask; take the default answers (default: off; ask in
                      a terminal)
  --dry-run           show the files that would change, write and install
                      nothing (default: off)
  -h, --help          display help for command

Examples:
  $ jss-devtools init my-app              create my-app, asking for the package manager
  $ jss-devtools init my-app --pm pnpm -y create my-app with pnpm, no questions (CI)
  $ jss-devtools init                     set up the project in the current folder
  $ jss-devtools init --dry-run           show what would change, write nothing
  $ jss-devtools init -f                  replace existing ESLint, Prettier and commitlint configs
```

`--pm` has no commander default: an absent value is what triggers the question.

## Files to Create / Modify

Modify: `src/commands/init/init.command.ts`, `src/core/constants/common-option.constant.ts`,
`tests/init.command.test.ts`, `tests/bundle.test.ts`. Create a `*.ui.ts` only if the plan rendering
or the select prompt is shared; otherwise render in `init.command.ts`.

## Verification

- `init --help` from the bundle equals the block above.
- The no-terminal, declined and install-failure exits, each in a temp folder. Install failure is
  forced with an unreachable registry (`npm_config_registry=http://127.0.0.1:9`), and the test asserts
  the files are kept.

## Tasks & Steps

- [ ] Package-manager select and final confirmation, with the no-terminal, declined and `-y` paths
- [ ] Write in order: mkdir and `gitInit` (create), entries, deletions last
- [ ] Install with inherited stdio; on failure exit 1 with the install command, nothing rolled back
- [ ] Sort `package.json` with the project's `prettier-package-json`, then `prettier`
- [ ] Outro with next steps
- [ ] Options and help text; `init --help` from the bundle equals the block exactly
- [ ] Run the full gate; commit
