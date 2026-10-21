---
title: Cooked the init command scaffold
date: 2026-10-22
summary: "Registered jss-devtools init with the shared -y, --yes and --dry-run flags, declared once in core, and a help with an Examples section; the command writes nothing yet"
---

# Cooked the init command scaffold

## What happened

The [init command scaffold plan](../261022-0225-init-command-scaffold/plan.md) was cooked.
`jss-devtools init` is registered, it takes `-y, --yes` and `--dry-run`, and its help carries the
`Examples` section. The flags are declared once, as plain data in
`src/core/constants/common-option.constant.ts`, and the command attaches the ones it needs. Every
run ends with "Nothing to set up": the flow is a separate plan, still open.

## Findings

- **The help block is the contract.** The examples say what the flags will do, while the command
  does nothing yet. The block is the thing the flow has to meet, so the test compares the whole
  output byte for byte, from the bundle and in process.
- **A subcommand does not inherit the root's `exitOverride`.** Commander copies that setting when
  the subcommand is created, and the root sets it after the commands are registered, so an
  in-process test of `init --help` would call `process.exit` and take the worker with it. The
  tests give each subcommand its own override instead of changing the program.
- **The action is not async.** Nothing in it awaits, and the lint rule says so. The doctor's action
  is async because it awaits its checks.
- **The examples need a leading newline.** Commander's `addHelpText('after', …)` appends the text
  directly under the options block, so the blank line above `Examples:` is part of the string.

## Also

- `doctor` keeps neither shared flag, so `jss-devtools doctor --yes` is an unknown option and
  exits 1.
- The flag strings appear once in `src/`, in the constant.
- No comment was added in `src/`: the code says what it does. The one comment in the test file
  hides the exit-override trap.
- The gate is green on Node 24.11.0: lint, typecheck, 12 files with 105 tests, build, format.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
