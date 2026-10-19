---
id: 0023
title: Exit codes 0 and 1, and CliError for an expected failure
status: accepted
date: 2026-10-21
---

# 0023 Exit codes 0 and 1, and CliError for an expected failure

## Context

The old prototype carried four exit codes, `0/1/2/3`, and the new repository had none declared. The
rewrite needs a scheme before the first command lands, because every command ends with one and the
installer reads the version, not the code.

## Decision

Two codes: `0` for success, `1` for a failure. A command that fails for an expected reason throws
`CliError`, which carries the exit code and an optional hint that says what to do about it. Anything
else is a crash and stays a bare line on stderr with the stack under `JSS_DEBUG=1`.

- `src/core/constants/exit-code.constant.ts` declares `ExitCode = { ok: 0, failure: 1 }` and its type.
- `src/core/errors/cli.error.ts` declares `CliError`, with the exit code defaulting to `failure`.
- `src/cli.ts` renders a `CliError` through `renderError` and ends with its exit code. A crash goes
  through `reportFatalError`, which never exits 0.
- More codes are added only when a command needs one that means something to a script.

The rule is tested, not documented: the architecture suite refuses `process.exit` and global process
handlers outside `src/cli.ts`, because the previous release shipped a handler that turned a crash into
exit 0.

## In the user's words

> "0/1, kiểu lỗi có code" (user, 2026-10-20)

## Consequences

- A script can rely on 0 meaning success and anything else meaning failure. It cannot tell a failed
  check from a crash by the code alone; the message on stderr says which.
- The hint is part of the error, so the fix travels with the failure instead of living in the docs.
- The old prototype's `2` and `3` are gone. Nothing in this repository used them yet.
