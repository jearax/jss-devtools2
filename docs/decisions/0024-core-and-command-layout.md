---
id: 0024
title: A core folder, one folder per command, and role suffixes
status: accepted
date: 2026-10-21
---

# 0024 A core folder, one folder per command, and role suffixes

## Context

`src/` held one file, `src/cli.ts`. Before the first product command lands, the layout has to be
settled, or every later command invents its own shape. The old prototype had `.harness/decisions/`
and a flat source tree, and neither carried over.

The boundaries have to be enforceable, not a convention: the previous release shipped a global
process handler that turned a crash into exit 0, and a comment in the source did not stop it.

## Decision

`src/` has two folders, and a file name says what the file is.

```
src/
├─ cli.ts                     the program, the exit code, the global handlers
├─ core/                      shared; imports no command and no commander
└─ commands/
   └─ doctor/                 one folder per command
```

| Suffix         | Folder              | Role                                                             |
| -------------- | ------------------- | ---------------------------------------------------------------- |
| `.command.ts`  | command folder root | commander wiring, argument parsing, rendering through clack      |
| `.ui.ts`       | `ui/`               | terminal rendering built on `@clack/prompts`, shared by commands |
| `.service.ts`  | command folder root | the command's logic; returns data, prints nothing                |
| `.check.ts`    | `checks/`           | one doctor check                                                 |
| `.adapter.ts`  | `adapters/`         | the only knowledge of one external tool's command line           |
| `.util.ts`     | `utils/`            | stateless helpers                                                |
| `.constant.ts` | `constants/`        | constant values                                                  |
| `.error.ts`    | `errors/`           | error classes                                                    |
| `.type.ts`     | `types/`            | types only                                                       |

The rules live in `tests/support/architecture-rules.ts` and each has a negative fixture that breaks
exactly that rule:

| Id                                               | Rule                                                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `file-role-suffix`                               | Every file under `src/` except `cli.ts` has a suffix from the table, in its folder                  |
| `core-imports-no-command`                        | `src/core/**` never imports from `src/commands/**`                                                  |
| `command-imports-no-other-command`               | `src/commands/<a>/**` never imports `src/commands/<b>/**`; logic two commands share goes to `core/` |
| `commander-in-command-files-only`                | `commander` only in `*.command.ts` and `cli.ts`                                                     |
| `clack-in-ui-layer-only`                         | `@clack/prompts` only in `*.ui.ts`, `*.command.ts` and `cli.ts`                                     |
| `output-in-ui-layer-only`                        | `process.stdout`, `process.stderr`, `console.` only in `*.ui.ts`, `*.command.ts` and `cli.ts`       |
| `child-process-in-runner-only`                   | `node:child_process` only in `core/utils/run-command.util.ts`                                       |
| `runner-in-adapters-only`                        | the command runner is called only by an adapter                                                     |
| `no-process-exit-outside-entry-point`            | `process.exit` only in `cli.ts`                                                                     |
| `no-global-process-handlers-outside-entry-point` | global process handlers only in `cli.ts`                                                            |

H0 decision 0010's rule, one adapter per external tool, carries over: the strings `git --version` and
`git rev-parse` appear only in `src/core/adapters/git.adapter.ts`.

## Amendment 2026-10-27: two command-owned roles

Approved by the user on 2026-10-27 for the init command. The record keeps its original date.

| Suffix         | Folder                       | Role                                                                     |
| -------------- | ---------------------------- | ------------------------------------------------------------------------ |
| `.constant.ts` | `commands/<name>/constants/` | constant values one command owns, such as the version table              |
| `.template.ts` | `commands/<name>/templates/` | the content of one file a command generates, as a function of its inputs |

## In the user's words

> "Cần modular hoá kiểu nestjs theo phân loại file nha, ví dụ: src/core/utils/abc.util.ts" (user,
> 2026-10-20)
>
> "IMHO, i think `src/modules` -> `src/commands`" (user, 2026-10-21)
>
> "Layout and rules: Approved as previewed, including H0 decision 0010's one-adapter-per-external-tool
> rule" (user, 2026-10-21)

## Consequences

- A new role needs an entry in the table, in `docs/code-standards.md` and in the rules, together. The
  rules are the contract, so a file with a suffix nothing allows fails the architecture test.
- A command cannot reach into another command. Two commands that need each other share something in
  `core/`, or they are one command.
- `core/` cannot import a command, so it stays free of product knowledge and a test proves it.
- The rule table and the fixtures are the source of truth. The table above is a copy; if the two
  disagree, the code wins.
