# Task: help casing, option values format, package manager order

For the cooker, 2026-10-28. Decided by the user; quotes and reasons are in
`plans/261022-0141-init-flow-discussion/decision-log.md`, sections "Help text casing", "Package
manager order" and "Help option format and articles". The full message review is in
`plans/reports/planner-261028-1136-init-message-rewrites.md`; **only the parts listed below are
decided**. Every other row there (errors E1-E26, prompts, outros, the other help rewordings) is still
under review: do not change those texts beyond what this task says.

## 1. Every help description starts with a capital letter

Applies to the root program, `init` and `doctor`: command descriptions, Arguments, Options, the
explanations in the `init` Examples, and commander's own texts. Keep the wording otherwise as it is
today, except the two options in section 2. Articles (a, an, the) stay.

| Text | Now | Target |
|---|---|---|
| `-v, --version` | output the version number | Output the version number |
| `-h, --help` (every command) | display help for command | Display help for command |
| `help [command]` | display help for command | Display help for command |
| `doctor` | check the environment | Check the environment |
| `init` | create a project, or set up the current one | Create a project, or set up the current one |
| `[dir]` | create a new project in this folder … | Create a new project in this folder … |
| `-f, --force`, `--no-vscode`, `-y, --yes`, `--dry-run` | lower-case first letter | same text, capital first letter |
| Examples, right column | create my-app, … / set up the project … / show … / replace … | Create my-app, … / Set up the project … / Show … / Replace … |

`-y` and `--dry-run` live in `src/core/constants/common-option.constant.ts`.

## 2. Option values format

An option with a fixed list renders `(values: "a" | "b"; default: "x")` instead of commander's
`(choices: "a", "b", default: "x")`. Options without a list keep what they show today.

Exact target lines:

```text
--framework <name>  Preset to apply; only node for now (values: "node" | "react" | "rn" | "next" | "nest"; default: "node")
--pm <name>         Package manager for a new project (values: "bun" | "pnpm" | "yarn" | "npm"; default: "npm")
```

(commander wraps them to the terminal width; the text is what matters.)

Constraints:

- Override `optionDescription` once through `configureHelp()` on the root program in `src/cli.ts`, and
  check that `init --help` and `doctor --help` get it (subcommands inherit the help configuration
  when they are created after it). Core may not import commander.
- `--pm` must stay `undefined` when it is not passed: the package manager question and the
  "--pm only applies when creating a project" check depend on it. Do not give it a parsed default.
  Show `default: "npm"` some other way (for example `defaultValueDescription` with no default value,
  rendered by the override); prove it with a test that `init --pm` absence still asks / still errors.

## 3. Package manager order: bun, pnpm, yarn, npm

Every list of the four uses this order:

| Where | Now | Target |
|---|---|---|
| `PM_CHOICES`, `src/commands/init/init.command.ts:27` | npm, yarn, pnpm, bun | bun, pnpm, yarn, npm |
| package manager question | npm preselected (first) | listed bun, pnpm, yarn, npm; `initialValue: 'npm'` so npm stays preselected |
| `SUPPORTED_AGENTS`, `preflight.service.ts:15` | npm, pnpm, bun, yarn | bun, pnpm, yarn, npm |
| `PackageManagerName`, `templates/package-json.template.ts:3` | npm, pnpm, yarn, bun | bun, pnpm, yarn, npm |
| `preflight.service.ts:66` and `:159` errors and their tests | supported: npm, yarn 1, pnpm, bun | supported: bun, pnpm, yarn 1, npm (only the order changes) |
| test loops: `tests/node-preset-templates.test.ts:25, :62, :80`; `MANAGERS` in `tests/init.e2e.test.ts:17` | npm, pnpm, yarn, bun | bun, pnpm, yarn, npm |
| `docs/decisions/0030-init-node-preset.md:115` | npm, pnpm and yarn | pnpm, yarn and npm |

Where it removes a duplicate, derive the lists from one declaration rather than repeating the order.
Detection order (lockfiles, npm fallback) does not change.

## 4. Docs

`docs/system-architecture.md` flag table (around line 209): capital first letter in the Meaning
column, and the `--pm` row matching section 2. Grep README and docs for any other copy of the help
text and align it.

## Out of scope

Every other row of the message review, the eight matrix issues (#1-#8), commits.

## Verification

1. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` on Node 24.11.0; the real output.
2. Paste the full output of `node dist/cli.mjs --help`, `init --help` and `doctor --help` (piped, no
   colours).
3. Tests cover: the `(values: …; default: …)` line for both options, the capitalised commander texts
   on root and on a subcommand, the question order with npm preselected, and the new error order.
4. No comments that restate the code.

Reply with `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`, a two-line summary, the
files changed, and the outputs above. The planner reviews and commits.

## Follow-up: order of the init examples

Decided after the task was sent (decision log, "Order of the init examples"). The `EXAMPLES` block
in `src/commands/init/init.command.ts`, with the capitalised text from section 1, becomes exactly:

```text
Examples:
  $ jss-devtools init my-app              Create my-app, asking for the package manager
  $ jss-devtools init my-app --pm pnpm -y Create my-app with pnpm, no questions (CI)
  $ jss-devtools init                     Set up the project in the current folder
  $ jss-devtools init -f                  Replace existing ESLint, Prettier and commitlint configs
  $ jss-devtools init --dry-run           Show what would change, write nothing
```

Align any copy of this list in README or docs, and any test that asserts it.
