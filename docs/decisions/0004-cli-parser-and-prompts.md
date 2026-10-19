---
id: 0004
title: commander 15 and @clack/prompts 1.8
status: accepted
date: 2026-10-19
---

# 0004 commander 15 and @clack/prompts 1.8

## Context

The CLI needs an argument parser that nests like Docker's command tree, and a prompt library for the
interactive flows that will follow. A probe of commander 15 on 2026-10-19 confirmed nested help,
aliases, "Did you mean" suggestions, `--no-*` negation, and exit 1 on an unknown option. A previous
candidate, citty 0.2.2, failed the same probe: a parent's `run()` executed after the subcommand,
nested help was wrong, and typos produced no suggestion.

## Decision

commander 15 for the command tree, `@clack/prompts` 1.8 for the terminal output and the interactive
prompts.

## In the user's words

> "commander 15 + @clack/prompts 1.8" (user, 2026-10-19)

## Consequences

- commander only reports an unknown command, and only suggests a correction, once subcommands exist.
  Until the first product command lands the root reports the unknown command itself and delegates to
  commander's suggestion afterwards. See [../system-architecture.md](../system-architecture.md).
- `@clack/prompts` renders through `src/core/ui/terminal.ui.ts`, which owns the cases clack does not
  cover: the animated primitives fall back to plain lines when the output is piped or in CI, and
  errors go to stderr. The animated and interactive primitives go through that layer, so the guard
  cannot be forgotten; a command may still use the plain ones directly, as the architecture rule
  allows.
- The animated spinner is the one exception: it is drawn by `src/core/ui/animated-spinner.ui.ts`,
  not by clack. Clack's spinner registers global process handlers while it runs, and the
  `unhandledRejection` handler it installs swallows a failure, so a detached rejection ends the CLI
  with exit 0. That is the failure this repository exists to prevent, so the frames are drawn here
  and the layer stays free of process state.

## Later

The banner came next: `--help` and `--version` open with the JSS block letters, with the name, the
version, the description, the Node version and the platform beside them. It shows on a terminal
only, so a captured `--version` stays a bare `x.y.z` for the installer to read.

> "Tôi cũng muốn có banner nữa nha, không phải text terminal thuần, nhìn chán lắm." (user,
> 2026-10-20)
>
> "Để apply phần banner cho help, version luôn á." (user, 2026-10-20)

The TUI framework was measured on 2026-10-20 and clack was kept, because it was the only candidate
that covered the logs, the spinner, the tasks and the prompts in one small library: inquirer covers
the prompts only, listr2 the tasks only and at ten times the size, ora the spinner only, and ink
needs a React renderer the CLI does not use. Two of clack's defects are real, and both are outside
a terminal: it writes cursor codes when the output is piped, and a prompt on a closed stdin never
settles
([bombshell-dev/clack#615](https://github.com/bombshell-dev/clack/issues/615), open since
2026-10-13). The layer answers the first with the plain-line fallback, and the second with a guard
that ships with the first prompt. A third defect showed up when the layer was built: clack's
spinner installs an `unhandledRejection` handler while it runs, which turns a detached rejection
into exit 0, and a `SIGINT` handler, which makes Ctrl+C print "Canceled" and carry on instead of
stopping the CLI. The layer draws its own frames because of that. The measurement is in
[the research report](../../plans/reports/researcher-261020-0023-tui-framework.md).

> "framework TUI tôi delegate full cho bạn, bạn nên /ak:research thêm" (user, 2026-10-20)

The flags came after that, and they are the same in every CLI this toolchain generates: `-h, --help`
and `-v, --version`. Commander's default for the version is `-V`, so the flag is declared
explicitly. The short flag is the reason the rule is worth writing down: `-v` is taken by the
version, so a `--verbose` added later cannot take `-v` for itself.

> "Đồng bộ, alias cho 4 bộ flag mà CLI nào cũng phải có là: -h|--help, -v|--version" (user,
> 2026-10-21)

The first command settled what clack is for. It is not the prompt library any more, it is the
rendering layer of every command: `doctor` opens with the banner, writes its checks through clack's
`intro`, `log` and `outro`, and the terminal layer decides whether those are animated lines or plain
ones. The architecture rules enforce it, so a command that reaches for `process.stdout` on its own
fails the test.

> "Tôi tưởng trong những phần liên quan CLI này, kể cả placeholder thì đã bắt đầu dùng framework TUI
> rồi chứ ta!" (user, 2026-10-21)
