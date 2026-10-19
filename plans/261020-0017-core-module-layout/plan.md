---
title: "Core and command layout, and the doctor command"
description: "One folder per command under src/commands, NestJS-style role suffixes, import boundaries enforced by architecture tests, a 0/1 exit-code scheme with CliError, a clack-based terminal UI layer, and doctor as the first real command."
status: done
priority: P1
effort: 4h
branch: main
tags: [architecture, cli, core, doctor]
blockedBy: []
blocks: []
created: 2026-10-20
---

# Core and command layout, and the doctor command

## Overview

`src/` gets its permanent shape before any product command exists: a shared `core/`, one folder per
command under `commands/`, and file names whose suffix states the file's role, NestJS style. The
boundaries are rules in `tests/support/architecture-rules.ts`, each with a negative fixture. The
first command is `doctor`, which checks the environment and replaces the zero-command
unknown-command fallback in `src/cli.ts`.

## Inputs fixed by the user (2026-10-19 to 2026-10-20)

| Question | Answer |
|---|---|
| X1 Exit codes | "0/1, kiểu lỗi có code": `ExitCode` `{ ok: 0, failure: 1 }`, a `CliError` carrying `exitCode` and a `hint`; more codes only when a command needs one |
| File organisation | "Cần modular hoá kiểu nestjs theo phân loại file nha, ví dụ: src/core/utils/abc.util.ts" |
| First command | "doctor": `node.version`, `git.installed`, `git.repository`, each with an ID and a fix hint; any failure exits 1 |
| Commands folder | "IMHO, i think `src/modules` -> `src/commands`" (2026-10-21): a folder per command, not per feature module |
| Layout and rules | Approved as previewed, including H0 decision 0010's one-adapter-per-external-tool rule |
| TUI framework | "framework TUI tôi delegate full cho bạn, bạn nên /ak:research thêm": researched, keep `@clack/prompts` behind `core/ui` guards ([report](../reports/researcher-261020-0023-tui-framework.md)) |
| Terminal UI | "Tôi tưởng trong những phần liên quan CLI này, kể cả placeholder thì đã bắt đầu dùng framework TUI rồi chứ ta!": every command renders through `@clack/prompts` (decision 0004) from the first command on |
| Banner | Planned and shipped separately: "Chỗ banner, plan rồi riêng chỗ doctor đi." ([CLI banner plan](../261020-0023-cli-banner/plan.md)); doctor reuses it |

X2 is answered only for what touches core: H0 0009's exit-code part is replaced by X1, H0 0010's
adapter rule carries over. 0011 and 0012 are already superseded (decisions 0018, 0019, 0022). The
other H0 decisions belong to the toolchain and harness plans, which decide them when they reach them.

## Target layout

```
src/
├─ cli.ts                          program, exit code, global handlers, registers the commands
├─ core/                           shared; imports no command and no commander
│  ├─ adapters/git.adapter.ts      the only file that knows git's command line
│  ├─ constants/
│  │  ├─ banner.constant.ts        exists, from the banner plan
│  │  ├─ exit-code.constant.ts     exists
│  │  └─ package.constant.ts       name, description, version, Node floor: the one build define
│  ├─ errors/cli.error.ts
│  ├─ ui/
│  │  ├─ animated-spinner.ui.ts    exists: the frames, drawn without clack's process handlers
│  │  ├─ banner.ui.ts              exists: renderBanner(), showBanner()
│  │  └─ terminal.ui.ts            exists: isInteractive(), TTY-only spinner and tasks, errors to stderr
│  └─ utils/
│     ├─ run-command.util.ts       the only spawner; only *.adapter.ts may import it
│     └─ version.util.ts           numeric major.minor.patch comparison
└─ commands/
   └─ doctor/
      ├─ doctor.command.ts         commander wiring; renders through clack
      ├─ doctor.service.ts         runs the checks, returns results, no I/O
      ├─ checks/{node-version,git-installed,git-repository}.check.ts
      └─ types/doctor-check.type.ts
```

| Suffix | Folder | Role |
|---|---|---|
| `.command.ts` | command folder root | commander wiring, argument parsing, rendering through clack |
| `.ui.ts` | `ui/` | terminal rendering built on `@clack/prompts`, shared by commands |
| `.service.ts` | command folder root | the command's logic; returns data, prints nothing |
| `.check.ts` | `checks/` | one doctor check |
| `.adapter.ts` | `adapters/` | the only knowledge of one external tool's CLI |
| `.util.ts` | `utils/` | stateless helpers |
| `.constant.ts` | `constants/` | constant values |
| `.error.ts` | `errors/` | error classes |
| `.type.ts` | `types/` | types only |

## Rules enforced by the architecture suite

| Id | Rule |
|---|---|
| `file-role-suffix` | Every file under `src/` except `cli.ts` has a suffix from the table, in its folder |
| `core-imports-no-command` | `src/core/**` never imports from `src/commands/**` |
| `command-imports-no-other-command` | `src/commands/<a>/**` never imports `src/commands/<b>/**`; logic two commands share goes to `core/` |
| `commander-in-command-files-only` | `commander` only in `*.command.ts` and `cli.ts` |
| `clack-in-ui-layer-only` | `@clack/prompts` only in `*.ui.ts`, `*.command.ts` and `cli.ts` |
| `output-in-ui-layer-only` | `process.stdout`, `process.stderr`, `console.` only in `*.ui.ts`, `*.command.ts` and `cli.ts` |
| `child-process-in-runner-only` | `node:child_process` only in `core/utils/run-command.util.ts` |
| `runner-in-adapters-only` | `run-command.util` imported only by `*.adapter.ts` |
| existing two | `process.exit` and global process handlers only in `cli.ts` |

## Phases

| # | Phase | Effort | Depends on | Status |
|---|---|---|---|---|
| 1 | [Core layer and path-aware architecture rules](./phase-01-core-and-architecture-rules.md) | 1.5h | - | done |
| 2 | [The doctor command](./phase-02-doctor-module.md) | 1.5h | 1 | done |
| 3 | [Docs and decisions](./phase-03-docs-and-decisions.md) | 1h | 2 | done |

## Acceptance criteria

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green on Node 22.22.1.
- Every rule in the table has a fixture that trips exactly that rule, and `src/` has no violation.
- `jss-devtools doctor` exits 0 inside a git repository on a supported Node, and 1 with a fix hint
  outside one; proven against the built bundle.
- The unknown-command fallback is gone from `src/cli.ts`; `jss-devtools nope` still exits 1 and
  names the command.
- The Node floor, the description and the version reach the CLI from `package.json` through one
  build `define`, never as a copy; `src/cli.ts` keeps no package literal.
- `doctor` renders through clack; piped or in CI its output has no ANSI cursor sequences, and a
  `CliError` is written to stderr.
- `doctor` opens with the banner on a TTY, as root help already does.

## Non-goals

`--json` output, interactive prompts (doctor asks nothing), restyling commander's own help and
parse errors, the toolchain and harness commands, checks for pnpm or
package managers (they wait for T1 to T5), new exit codes.

## Release note

A push to `main` deploys: the install site will serve a CLI with `doctor`. CI on the floor and the
image smoke test gate it as before.
