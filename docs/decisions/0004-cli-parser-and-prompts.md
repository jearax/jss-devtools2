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

commander 15 for the command tree, `@clack/prompts` 1.8 for interactive prompts.

## In the user's words

> "commander 15 + @clack/prompts 1.8" (user, 2026-10-19)

## Consequences

- commander only reports an unknown command, and only suggests a correction, once subcommands exist.
  Until the first product command lands the root reports the unknown command itself and delegates to
  commander's suggestion afterwards. See [../system-architecture.md](../system-architecture.md).
- `@clack/prompts` is installed but not yet imported. It is bundled only once something imports it.
