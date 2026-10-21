---
title: "init command scaffold"
description: "Register `jss-devtools init` with the shared flags `-y, --yes` and `--dry-run`, declared once in core, and its help with examples. The flow itself (what init creates, preflight, conflicts, confirmation) is not part of this plan."
status: done
priority: P1
effort: 1h
branch: main
tags: [init, cli, flags]
blockedBy: []
blocks: []
created: 2026-10-22
---

# init command scaffold

## Outcome

`jss-devtools init` exists, accepts the shared flags and documents them in its help. It writes
nothing and asks nothing: the flow is planned separately, while this plan is cooked. The shared flags
are declared once in `src/core/`, so the next command that asks a question attaches the same flags.

## Input from the user (2026-10-22)

All decisions, with quotes, are in
[the init flow decision log](../261022-0141-init-flow-discussion/decision-log.md). The parts this plan
uses:

- Order of work: "chốt scaffold của common flag rồi commit plan, đưa plan cho cooker implement."
- Scope: "Chỉ mới ở mức scaffold structure thôi, chưa có vụ files đã tồn tại đâu, có đó là quyết định
  của flow command init luôn rồi."
- Flags: `-h, --help`, `--dry-run`, `-y, --yes`. `--json` is dropped: "Bỏ hết mọi thứ liên quan
  --json, vì usecase k thực tế."
- `-y` never asks and takes each question's default; the defaults are designed with each question.
- `-y` and `--dry-run` are declared once and attached by each command that needs them; `doctor`
  has neither ("Khai báo 1 lần, command nào cần thì gắn").
- `--help` carries an `Examples` section ("a, có Examples").

## Scope

| File | Change |
|---|---|
| `src/core/constants/common-option.constant.ts` | New. `COMMON_OPTIONS`, plain data: `yes: { flags: '-y, --yes', description: 'do not ask; take the default answers' }`, `dryRun: { flags: '--dry-run', description: 'show the changes, write nothing' }`, `as const`. No commander import: the `commander-in-command-files-only` rule forbids it outside `*.command.ts` |
| `src/commands/init/types/init-options.type.ts` | New. `InitOptions = { yes?: true; dryRun?: true }`, the shape commander hands the action for a boolean flag |
| `src/commands/init/init.command.ts` | New. `registerInitCommand(program)`: `init`, description `initialize a project`, `.option()` for `COMMON_OPTIONS.yes` then `COMMON_OPTIONS.dryRun`, `addHelpText('after', …)` with the examples below. The action shows the banner, `intro(' jss-devtools init ')` the way `doctor` does, and `outro('Nothing to set up')`. Exit 0 |
| `src/cli.ts` | Call `registerInitCommand(program)` after `registerDoctorCommand(program)` |
| `tests/cli.test.ts` or a new `tests/init.command.test.ts` | The cases under Acceptance, through `main(…, { exitOverride: true })` as `tests/cli.test.ts` does |
| `tests/bundle.test.ts` | `dist/cli.mjs init --help` from the temp directory lists both flags and `Examples:`, exit 0 |
| `docs/decisions/0029-shared-command-flags.md` | New. The flag contracts below, with the user's quotes from the decision log. Number 0029, not 0027: 0027 is taken on the parked branch `wip/init-frame` |
| `docs/codebase-summary.md`, `docs/system-architecture.md`, `docs/project-roadmap.md`, `README.md` | Add `init` where `doctor` is listed: the tree, the registration line, the roadmap "Done" section, the usage block. State that `init` writes nothing yet |

No `init.service.ts`: a service returns data, and the scaffold has none to return. No
`confirm.ui.ts`: nothing is asked yet. Both arrive with the flow plan.

`--help` must render exactly this (commander 15 output, verified on 2026-10-22):

```text
Usage: jss-devtools init [options]

initialize a project

Options:
  -y, --yes   do not ask; take the default answers
  --dry-run   show the changes, write nothing
  -h, --help  display help for command

Examples:
  $ jss-devtools init              ask before writing
  $ jss-devtools init --dry-run    show what would change
  $ jss-devtools init --yes        write without asking, e.g. in CI
```

## Flag contracts for decision 0029

These are decided. The scaffold only parses the flags; their effect lands with the flow.

- `-y, --yes`: never asks a question; each question takes its default, designed with that question.
  It does not mean "answer yes". Without `-y`, a terminal asks; with no terminal on stdin or stdout,
  or with `CI` set, a question exits 1 with "run it in a terminal, or pass --yes".
- `--dry-run`: runs the read-only stages, shows `+` new and `~` changed files, writes nothing (no
  file, no install, no hooks, no manifest) and never asks. Exit 0 whenever the plan is shown,
  changes or not. With `--yes` it still writes nothing and is not an error.
- `-h, --help`: commander's usage and options plus `Examples`. Exit 0. Always text.
- Declining a confirmation, or Ctrl+C at it, exits 1 with "cancelled, nothing written" on stderr.
- No `--json`, no JSON output anywhere (closes T4).
- Shared flags are declared once in `src/core/constants/` and attached per command.

## Steps

1. Commit this plan, the decision log folder `plans/261022-0141-init-flow-discussion/` and the
   English translation of `plans/reports/code-reviewer-261019-1519-phase-0-and-toolchain-review.md`
   as one docs commit, before any code. **Done (2026-10-22)**, commit `5f0f0c0`.
2. Add the constant, the type, the command and the registration. **Done (2026-10-22).**
3. Add the tests. **Done (2026-10-22).**
4. Add decision 0029 and the doc updates. **Done (2026-10-22).**
5. Run the full gate and commit as a second commit. **Done (2026-10-22).**

## Acceptance

- `jss-devtools init --help` prints the block above, exit 0. **True on 2026-10-22:** the output is
  byte for byte the block above, from the bundle and in process.
- `jss-devtools init`, `init -y`, `init --dry-run` and `init -y --dry-run` each end with
  "Nothing to set up", exit 0, and leave the working directory unchanged. **True on 2026-10-22:**
  the bundle run in an empty temp directory leaves it empty.
- `jss-devtools init --dryrun` exits 1 and suggests `--dry-run`. **True on 2026-10-22:** commander
  prints `(Did you mean --dry-run?)`.
- `jss-devtools doctor --yes` exits 1 with "unknown option": `doctor` does not take the shared flags.
  **True on 2026-10-22.**
- The flag strings appear once in `src/`, in `common-option.constant.ts`
  (`git grep -n -- "'-y, --yes'" src` prints one line). **True on 2026-10-22.**
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green on Node 24.11.0, with the real output
  reported. **True on 2026-10-22:** lint, typecheck, 12 files with 105 tests, build.

## Non-goals

- What `init` creates, where (`[dir]`), preflight, presets, versions, conflicts, the confirmation
  prompt, install, hooks, manifest. They belong to the init flow plan, under discussion.
- `--no-*` flags, `--force`, `--framework`.
- Code from `wip/init-frame`. That branch stays parked as reference.

## Constraints

- Extensionless `@/` imports; no `.js`.
- Zero comments unless a line hides a trap the code cannot show.
- All plan, decision and report prose in English; user quotes stay verbatim.
- Conventional commits, no AI reference, no `Co-Authored-By` line. Do not push: a push to `main`
  deploys.

## Risk

- The help examples describe what the flags will do, not what the scaffold does: today every run says
  "Nothing to set up". Accepted, because the user asked for the scaffold before the flow, and the
  outro says plainly that nothing is set up.

## Unresolved questions

- None for this plan. The init flow questions (T2 above all, with "Usecase chính của CLI này chủ yếu
  là init repo, kiểu như vite create á") are in the decision log.

## Outcome

Done on 2026-10-22. `jss-devtools init` is registered with the shared flags `-y, --yes` and
`--dry-run`, and its help carries the `Examples` section. The flags are declared once in
`src/core/constants/common-option.constant.ts` and attached by the command that needs them. Every run
ends with "Nothing to set up": the flow is not part of this plan.

Two things the plan did not say. The action is not async, because nothing in it awaits. And a
subcommand does not inherit the root's `exitOverride`, because commander copies that setting when
the subcommand is created, so the in-process tests give each subcommand its own override; without
it, a test of a subcommand's help would exit the worker.
