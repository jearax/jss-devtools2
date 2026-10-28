# Task: long flag first

For the cooker, 2026-10-28, after the colour plan. Decided by the user (decision log, "Long flag
first"): a flag with a short alias is written long first, `--force, -f`, everywhere it appears.

| Where | Now | Target |
|---|---|---|
| `src/cli.ts` `.version(…)` | `-v, --version` | `--version, -v` |
| `src/cli.ts` `.helpOption(…)` | `-h, --help` | `--help, -h` (root and every subcommand) |
| `src/core/constants/common-option.constant.ts` | `-y, --yes` | `--yes, -y` |
| `src/commands/init/init.command.ts` | `-f, --force` | `--force, -f` |
| `src/commands/init/init.service.ts` error and its tests | `-f, --force only applies …` | `--force, -f only applies …` (only the flag order changes) |
| help snapshots in `tests/init.command.test.ts`, `tests/bundle.test.ts` | short first | long first |
| `docs/system-architecture.md` (lines 138, 211, 213, 217), `docs/project-overview-pdr.md:26`, `docs/code-standards.md:183`, `docs/project-roadmap.md` (11, 92), `docs/decisions/0029-shared-command-flags.md` (27, 33), `docs/decisions/0030-init-node-preset.md` (52, 73) | short first | long first |

Commander 15 parses `-f` and `--force` from `'--force, -f'` (probed by the planner). Add a test that
both forms still parse for `--force`, `--yes` and `--version`, and that `--help` and `-h` both print
help. Leave plans, reports, journals and the decision log as they are (history). Grep for any other
`-x, --long` string in `src`, `tests`, `docs` and `README.md` and align it.

Verification: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output, plus the piped
`node dist/cli.mjs --help` and `init --help`. No commit. Reply with the Status block.

## Also: default last

Decided after this task was written (decision log, "Default last"). Inside the parentheses of a help
line, `default: …` always comes last; notes come first, `values: …` before `default`, all separated by
`; `. Only the order changes:

| Option | Now | Target |
|---|---|---|
| `--force, -f` | `(default: off; init stops and lists them)` | `(init stops and lists them; default: off)` |
| `--yes, -y` | `(default: off; ask in a terminal)` | `(ask in a terminal; default: off)` |
| `--framework`, `--pm`, `--no-vscode`, `--dry-run` | already end with `default: …` | unchanged |

Add a test over the rendered `--help` of every command: each option line that has `default:` has it
as the last item before `)`. The same rule applies to the docs tables if they show defaults.

## Comments

Repo rule, strict: default zero comments. A comment survives only if removing it would likely cause a
wrong change (a platform or tool trap, the failure a guard prevents, an external contract); one line,
two only for a new fact. No JSDoc that says what a function, type or constant is or does. List every
comment your diff adds in the reply.

## Also: heading right above the list

The approved mockup puts the plan list directly under its heading. Today a bare `│` line separates
them (clack's default spacing on `log.message`). Render the list with `spacing: 0`, as
`src/core/ui/check-list.ui.ts` already does, so it reads:

```text
◇  my-app: 13 to create
│  + package.json
```
