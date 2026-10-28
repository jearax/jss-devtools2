# CLI message rewrites: proposal for review

Two fixes from the user on 2026-10-28, after reading
[the init test matrix](./planner-261028-0122-init-command-test-matrix.md):

- U1, decided: every description in `--help` starts with a capital letter, commander's own texts
  included (decision log, "Help text casing"). Runtime messages keep their casing.
- U2: "Các câu msg cần ngắn gọn, đảm bảo ý, chắc chắc có thể giúp được user." Every message is short,
  keeps its meaning, and tells the user what to do next.

The rule applied below: what is wrong, then one concrete action, in one line; no word the user does
not need. Messages that already meet it are listed as "keep" so the review covers every string.
Where a row also settles one of the planner's eight matrix issues, the last column says which.

Columns: **Now** is the exact text today; **Proposed** is the exact text to ship (`<x>` is filled in
at run time); **Why** says what the change buys.

## Help text (`--help`)

| # | Where | Now | Proposed | Why | Matrix issue |
|---|---|---|---|---|---|
| H1 | root, `-v, --version` (commander) | output the version number | Output the version number | U1 | |
| H2 | root, `-h, --help` and `help [command]` (commander) | display help for command | Display help for command | U1 | |
| H3 | `doctor` description | check the environment | Check Node.js, git and the git repository | Says what is checked | |
| H4 | `init` description | create a project, or set up the current one | Create a project, or set up the current one | U1 | |
| H5 | `init [dir]` | create a new project in this folder (missing or empty); without it, set up the project in the current folder | Folder for a new project (missing or empty); omit it to set up the current folder | Shorter, same two cases | |
| H6 | `--framework <name>` | the preset to apply; only node is built so far (choices: "node", "react", "rn", "next", "nest", default: "node") | Preset to apply; only node for now (values: "node" \| "react" \| "rn" \| "next" \| "nest"; default: "node") | Shorter; the values and default format below | |
| H7 | `--pm <name>` | package manager for a new project; asked when omitted, npm with --yes. Not accepted without <dir>: the current folder's manager is detected (choices: "npm", "yarn", "pnpm", "bun") | Package manager for a new project (values: "bun" \| "pnpm" \| "yarn" \| "npm"; default: "npm") | User: "asked if omitted" is redundant. `npm` is the true default: `--yes` and `--dry-run` take it, and the question preselects it (first in the list). `--pm` without `<dir>` fails with its own message (E20) | |
| H8 | `-f, --force` | replace the config files init owns when they already exist, and delete their other names (default: off; init stops and lists them) | Replace existing ESLint, Prettier, commitlint and editor configs (default: off: init stops and lists them) | Names the files instead of "the config files init owns" | |
| H9 | `--no-vscode` | do not write .vscode/ (default: written) | Do not write .vscode/ (default: written) | U1 | |
| H10 | `-y, --yes` | do not ask; take the default answers (default: off; ask in a terminal) | Skip the questions and use the defaults (default: off: asks in a terminal) | Shorter | |
| H11 | `--dry-run` | show the files that would change, write and install nothing (default: off) | Show what would change; write and install nothing (default: off) | Shorter | |
| H12 | Examples | create my-app, asking for the package manager / create my-app with pnpm, no questions (CI) / set up the project in the current folder / show what would change, write nothing / replace existing ESLint, Prettier and commitlint configs | Create my-app, asking for the package manager / Create my-app with pnpm, no questions (CI) / Set up the current folder / Show what would change, write nothing / Replace existing ESLint, Prettier and commitlint configs | U1; one shorter | |

Format for every option (user, 2026-10-28): `(values: "a" | "b"; default: "x")`, replacing commander's `(choices: "a", "b", default: "x")`. Options without values keep `(default: …)`. Commander 15 renders that part in `Help.optionDescription`, which `configureHelp()` can override once on the root program. `--pm` cannot use `.default('npm')`: a default value would make every run look like `--pm` was passed, so the question and the E20 check would break; its default is written in the text.

## Errors (exit 1)

| # | When | Now | Proposed | Why | Matrix issue |
|---|---|---|---|---|---|
| E1 | `<dir>` is not empty | `<dir>` is not empty; to set up the project in it: cd `<dir>` && jss-devtools init | `<dir>` is not empty; to set it up instead: cd `<dir>` && jss-devtools init | Shorter | |
| E2 | `<dir>` is a file | (same as E1, wrong hint) | `<dir>` is a file; pick another name | The E1 hint cannot work on a file | #1 |
| E3 | git missing | git is not installed | git is not installed; install it, then rerun | Adds the action | |
| E4 | `--pm` manager missing (create) | `<pm>` is not installed; install it, or pick another with --pm | keep | Already what + action | |
| E5 | detected manager missing (existing) | `<pm>` is not installed; install it | this project uses `<pm>`, which is not installed; install it | Says why that manager | |
| E6 | yarn 2+ for create | yarn `<v>` is not supported; supported: npm, yarn 1, pnpm, bun | yarn `<v>` is not supported, only yarn 1; pick another with --pm | Adds the action | |
| E7 | detected manager unsupported | `<agent>` is not supported; supported: npm, yarn 1, pnpm, bun | `<agent>` is not supported; supported: bun, pnpm, yarn 1, npm | Package manager order | |
| E8 | no package.json | no package.json here; to create a project: jss-devtools init `<name>` | keep | Already what + action | |
| E9 | package.json is not JSON | Unexpected end of JSON input (the parser's text only) | package.json is not valid JSON (`<parser message>`); fix it, then rerun | Names the file | #3 |
| E10 | monorepo | monorepos are not supported yet | keep | No action to offer | |
| E11 | no tsconfig.json | no tsconfig.json here; init sets up TypeScript projects. To create one: jss-devtools init `<name>` | no tsconfig.json here; add one, or create a new project: jss-devtools init `<name>` | Two actions, shorter | |
| E12 | not a git repository | not a git repository; run git init first | keep | | |
| E13 | run in a subfolder | the git root is `<rel>`; run jss-devtools init there | run it at the git root: cd `<rel>` && jss-devtools init | Gives the command | |
| E14 | other core.hooksPath | git hooks are managed by `<path>` (core.hooksPath); remove it with git config --unset core.hooksPath to use husky | core.hooksPath is `<path>`; to use husky: git config --unset core.hooksPath | Shorter | |
| E15 | pnpm-workspace.yaml flow style | pnpm-workspace.yaml cannot be extended line by line; add these entries by hand: allowBuilds.esbuild: true, allowBuilds.unrs-resolver: true | add esbuild: true and unrs-resolver: true under allowBuilds in pnpm-workspace.yaml, then rerun | Leads with the action | |
| E16 | owned configs exist | these files already exist: `<list>`; to replace them: jss-devtools init --force; or pass --no-vscode | already set up: `<list>`; to replace them: jss-devtools init --force (--no-vscode keeps .vscode/) | Says what --no-vscode does | |
| E17 | no valid package name | `<folder>` has no valid npm package name; use a folder name with Latin letters or digits | `<folder>` cannot be a package name; use Latin letters or digits | Shorter | |
| E18 | git init failed | git init failed in `<dir>`; run git init there to see why | keep | | |
| E19 | `--framework` not node | `<name>` is not supported yet; only node is | keep | | |
| E20 | `--pm` without `<dir>` | --pm only applies when creating a project; here the package manager is detected | --pm needs `<dir>`; an existing project uses the manager it has | Shorter | |
| E21 | `-f` with `<dir>` | -f, --force only applies when setting up an existing project; a new project has nothing to replace | --force is for an existing project; drop it when creating one | Shorter | |
| E22 | not a terminal, no -y | run it in a terminal, or pass --yes | keep | | |
| E23 | cancelled | cancelled, nothing written | keep | | |
| E24 | install failed | install failed; the files are written. To finish: `<cd …> && <pm> install` | keep | | #2 drops `cd .` |
| E25 | package.json sort failed | `<bin>` failed; the files are written. `<tool output>` To finish: `<command>` | keep | | #2 drops `cd .` |
| E26 | doctor, a check failed | `<n>` of `<m>` checks failed | keep | Each failed row already has its hint | |

## Prompts and outros

| # | When | Now | Proposed | Why | Matrix issue |
|---|---|---|---|---|---|
| P1 | package manager question | package manager | which package manager? | Reads as a question | |
| P2 | confirm | write `<n>` files to `<name>` and install? | write `<n>` files to `<name>` and install? (with -f deletions: write `<n>`, delete `<m>` in `<name>` and install?; one file is "1 file") | Counts deletions apart | #5 |
| O1 | dry run | Dry run: `<n>` files would be written | dry run: `<n>` files to write, nothing changed (with deletions: `<n>` to write, `<m>` to delete) | Counts deletions apart; same casing as the other outros | #5 |
| O2 | create done | next: cd `<target>`, `<pm>` run dev | keep; `<pm>` run dev alone when the target is the current folder | | #2 |
| O3 | existing done | done | done; next: `<pm>` run format, then commit | Existing code rarely matches the new Prettier config: checked 2026-10-28 on a bun project with double quotes, `bun run lint` exits 1 right after init and 0 after `bun run format` | |
| O4 | doctor passed | All `<m>` checks passed | keep | | |

## Package manager order (U3)

Decided (decision log, "Package manager order"): bun, pnpm, yarn, npm in every list.

| Where | Now | Proposed |
|---|---|---|
| `PM_CHOICES`, init.command.ts:27 (help values, question order) | npm, yarn, pnpm, bun | bun, pnpm, yarn, npm; the question sets `initialValue: npm` so npm stays preselected |
| `SUPPORTED_AGENTS`, preflight.service.ts:15 | npm, pnpm, bun, yarn | bun, pnpm, yarn, npm |
| `PackageManagerName`, package-json.template.ts:3 | npm, pnpm, yarn, bun | bun, pnpm, yarn, npm |
| errors E6 and E7, preflight.service.ts:66 and :159, and their tests | supported: npm, yarn 1, pnpm, bun | supported: bun, pnpm, yarn 1, npm |
| test loops: node-preset-templates.test.ts:25, :62, :80; `MANAGERS`, init.e2e.test.ts:17 | npm, pnpm, yarn, bun | bun, pnpm, yarn, npm |
| decision 0030 line 115 | npm, pnpm and yarn | pnpm, yarn and npm |

Detection priority (lockfiles bun, pnpm, yarn, npm; npm when nothing is found) already follows this
order and does not change. The decision log keeps its history as written.

## Not covered by U1, U2 or U3

From the planner's eight issues, these do not overlap and stay for the end of the review: #4
(legacy `.eslintrc.json` left by `-f`), #6 (step lines around the package manager's install output),
#7 (caret drift, information only), #8 (`--dry-run` without `--pm` plans for npm without asking;
left out of H7 to keep the line short).
