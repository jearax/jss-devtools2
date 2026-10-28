---
id: 0029
title: The shared command flags
status: accepted
date: 2026-10-22
---

# 0029 The shared command flags

## Context

`init` initializes a project, and the first batch of its flags was decided before its flow. Two of
them are not `init`'s own: a command that asks a question needs a way not to ask, and a command
that writes needs a way to show what it would write. Deciding them once, in `core/`, keeps the next
command from inventing its own spelling.

The flags are decided. What each of them does with the `init` flow is not: the flow is still open
and is drawn in the
[init flow decision log](../../plans/261022-0141-init-flow-discussion/decision-log.md).

## Decision

The shared flags are declared once, as plain data in `src/core/constants/common-option.constant.ts`,
and each command attaches the ones it needs in its own `*.command.ts`. Core holds no commander
import, because only a command file may import commander.

- `--yes, -y`: never asks a question; each question takes its default, designed with that question.
  It does not mean "answer yes". Without `-y`, a terminal asks; with no terminal on stdin or stdout,
  or with `CI` set, a question exits 1 with "not a terminal" and the hint
  "Run it in a terminal, or pass --yes".
- `--dry-run`: runs the read-only stages, shows `+` new and `~` changed files, writes nothing (no
  file, no install, no hooks, no manifest) and never asks. Exit 0 whenever the plan is shown,
  changes or not. With `--yes` it still writes nothing and is not an error.
- `--help, -h`: commander's usage and options plus an `Examples` section. Exit 0. Always text.
- Declining a confirmation, or Ctrl+C at it, exits 1 with "cancelled, nothing written" on stderr.
- No `--json`, no JSON output anywhere. This closes T4.
- `doctor` asks nothing and has neither flag.

## In the user's words

> "Khai báo 1 lần, command nào cần thì gắn" (user, 2026-10-22, chosen option)

> "Đối với tôi, -y nghĩa là không hỏi bất kỳ câu hỏi nào, lấy giá trị default, dùng để support
> CI/CD á" (user, 2026-10-22)

> "Không phải có -y thì các câu hỏi default là yes. -y là của chung toàn command, các giá trị
> default thì tuỳ vào cách mình gán cho hợp lý, thiết kế sau." (user, 2026-10-22)

> "Bỏ hết mọi thứ liên quan --json, vì usecase k thực tế." (user, 2026-10-22)

> "a, có Examples" (user, 2026-10-22)

## Consequences

- A new command that asks a question attaches `COMMON_OPTIONS.yes` and gets the same spelling and
  the same meaning: no question, every default.
- The help examples describe what the flags do, decided with the flow in
  [0030](./0030-init-node-preset.md): `init --dry-run` previews the plan, and `init -y` takes every
  default, so a CI run never prompts.
