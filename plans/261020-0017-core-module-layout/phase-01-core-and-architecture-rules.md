---
phase: 1
title: "Core layer and path-aware architecture rules"
status: done
priority: P1
effort: "1.5h"
dependencies: []
---

# Phase 1: Core layer and path-aware architecture rules

## Goal
`src/core/` exists with exit codes, `CliError`, the terminal UI layer, the command runner, version
comparison and the git adapter, and the architecture suite can express path- and import-based rules.

## Context
- The scanner today matches one regex per file with an allow-list (`tests/support/architecture-rules.ts`).
  The new rules need a scope (which files a rule applies to) and, for `file-role-suffix`, a check on
  the path rather than the content.
- `tsconfig.json` includes `tests/`, so fixtures must typecheck; an import fixture needs a real
  target file.
- `tsdown.config.ts` and `vitest.config.ts` already inject `__JSS_VERSION__` from `package.json`.
- `@clack/prompts` 1.8.1, probed 2026-10-20: exports `intro`, `outro`, `log.*`, `spinner`, `note`,
  `cancel`, `isTTY`, `isCI`; `log.*` and `cancel` accept `{ output }`, so errors can go to stderr.
  The spinner writes ANSI cursor sequences even when stdout is piped, and still some under
  `CI=true`, so it must not run outside a TTY.
- `node:util` `styleText` on Node 22.22.1, probed 2026-10-20: colors are stripped when stdout is
  piped and kept under `FORCE_COLOR=1`, so the banner needs no color library.
- The banner plan lands first: `core/constants/banner.constant.ts` and `core/ui/banner.ui.ts`
  (`renderBanner`, `showBanner`) exist, and root help shows the banner. The new rules must
  accept both files as they are.

## Steps
- [x] Scanner: rules gain `scope` (path prefix or predicate on the logical path) and either
      `pattern` (content) or `check(path)` (path). The logical path is the path under `src/`; for
      fixtures, the path under `tests/fixtures/architecture/src/`, so a fixture is judged as if it
      lived at its mirrored place. Keep `allow`. **Done (2026-10-21).** One change: `check` takes
      `(logicalPath, content)`, not `(path)`, because `module-imports-no-other-module` has to read
      the import specifier and know which module the importing file is in.
- [x] Move the two existing fixtures into the mirrored tree (for example
      `tests/fixtures/architecture/src/commands/sample/forbidden-process-exit.service.ts`).
      **Done (2026-10-21):** both live under
      `tests/fixtures/architecture/src/commands/doctor/`, because `commands/<name>/` is the command
      folder root the suffix table allows.
- [x] Add the eight rules from [plan.md](./plan.md), each with one fixture under the mirrored tree.
      Import fixtures point at real files in the same fixture tree so they typecheck; those target
      files are not themselves fixtures. **Done (2026-10-21).** The two rules from before are the
      last two entries of the table, so there are ten in all.
- [x] `core/constants/exit-code.constant.ts`: `ExitCode = { ok: 0, failure: 1 } as const` and its
      type. **Done (2026-10-20), with the terminal UI layer.**
- [x] `core/errors/cli.error.ts`: `CliError extends Error` with `exitCode` (default `failure`) and an
      optional `hint`. **Done (2026-10-20), with the terminal UI layer.**
- [x] `core/ui/terminal.ui.ts`, per the [TUI research](../reports/researcher-261020-0023-tui-framework.md):
      `createSpinner()` and `runTasks()` animate on a TTY outside CI, and print plain
      `log.step`/`log.success`/`log.error` lines otherwise, because clack writes cursor codes
      when piped. No prompt wrapper yet: the guard for prompts (clack#615, a prompt on closed stdin
      never settles and exits 13) ships with the first prompt in the toolchain plan;
      `renderError(error)` writes the message and the hint with `log.error(…, { output: process.stderr })`.
      Shipped 2026-10-20 with the research; the file also owns `isInteractive()`, the one rule for
      "a human is watching", which the banner plan reads too.
- [x] `core/ui/animated-spinner.ui.ts`: the frames of the animated spinner. Clack's spinner is not
      used, because it registers global process handlers while it runs and its
      `unhandledRejection` handler turns a detached rejection into exit 0
      ([the review](../reports/code-reviewer-261020-0045-tui-layer-review.md)). Shipped
      2026-10-20 with the research.
- [x] `core/ui/banner.ui.ts`: add `showBanner()`, which writes `renderBanner(…)` to stdout when
      `shouldShowBanner` allows it, for commands to call before their `intro`. **Done (2026-10-20)
      with the banner plan:** `showBanner(info, context)` writes the banner and a blank line, and
      asks `isInteractive()` whether the output is a terminal. **Changed on 2026-10-21:** the info
      is built once in the file, so the call is `showBanner(context)` and every command shows the
      same banner.
- [x] Once `doctor` exists, check what a bare `jss-devtools` does (commander shows help when a
      subcommand is required) and that the banner opens it on a TTY. **Checked on 2026-10-21:** a
      bare `jss-devtools` shows commander's help on stderr and exits 1, and the banner does not
      open it, because commander marks that help as an error help. That is the same rule the banner
      plan set for the help after a usage error, so the two agree.
- [x] `src/cli.ts`: a `CliError` goes through `renderError` and sets its `exitCode`; anything else
      still goes through `reportFatalError`. **Done (2026-10-20), with the terminal UI layer:** the
      routing lives in `runProgram(program, argv)`, which `main` delegates to.
- [x] `core/utils/run-command.util.ts`: `execFile` without a shell, returns `{ code, stdout, stderr }`,
      maps "command not found" (`ENOENT`) to a distinct result instead of throwing. **Done
      (2026-10-21):** `code` is `null` when the command does not exist.**
- [x] `core/utils/version.util.ts`: parse `v22.22.1`, compare numerically. **Done (2026-10-21).**
- [x] `core/adapters/git.adapter.ts`: `version()` and `isInsideWorkTree(cwd)`, the only place the
      strings `git --version` and `rev-parse --is-inside-work-tree` appear. **Done (2026-10-21).**
- [x] One define replaces `__JSS_VERSION__`: `__JSS_PACKAGE__` = `{ name, description, version,
      nodeFloor }` from `package.json` (`name` is the `bin` key, `nodeFloor` is `engines.node`
      without `>=`), computed once in a module both `tsdown.config.ts` and `vitest.config.ts`
      import, declared only in `core/constants/package.constant.ts`, which exports it as `PACKAGE`.
      `src/cli.ts` drops its `pkg` literal: its description is a second copy of `package.json`
      today. The banner info (`PACKAGE` plus `process.version`, `platform`, `arch`) is built once in
      `banner.ui.ts`, so `cli.ts` and `doctor.command.ts` call `showBanner()` the same way.
      **Done (2026-10-21).** The reader is `scripts/package-info.mjs`, with
      `scripts/package-info.d.mts` for its types: tsdown loads its config with Node's own loader,
      and that resolver does not rewrite a `.js` specifier to a `.ts` file, so the shared module has
      to be a real `.mjs` file.
- [x] Unit tests: piped, `showBanner` writes nothing and the spinner and task fallbacks write plain
      lines with no ESC byte; version comparison (`22.9.0` < `22.22.1`), runner ENOENT, git adapter against a
      temp repo and a temp non-repo. The spinner and task fallbacks are covered (2026-10-20, in
      `tests/terminal-ui.test.ts`); the banner part is the banner plan's. **Done (2026-10-21):**
      `tests/version.util.test.ts`, `tests/run-command.util.test.ts` and `tests/git-adapter.test.ts`.

## Verification
- `pnpm test` green; each new fixture trips exactly its rule; `src/` clean.
- `pnpm lint && pnpm typecheck` green.

## Risks
- A path rule that is too strict blocks legitimate files. The suffix table is the contract; a new
  role is added to the table and to `code-standards.md` together.

## Review
- [code-reviewer-261020-0045-tui-layer-review.md](../reports/code-reviewer-261020-0045-tui-layer-review.md),
  2026-10-20, on the terminal UI layer, the `src/cli.ts` routing and the tests.
- **One blocker before any command adopts the layer:** clack's spinner registers global process
  handlers for as long as it runs, and its `unhandledRejection` handler swallows a rejection and
  lets the process exit 0. Measured through the repository's own `runTasks`: the interactive branch
  exits 0 on a detached rejection, the piped branch exits 1. The architecture rule cannot see it,
  because the handler is registered by the library. SIGINT is swallowed the same way, so Ctrl+C
  prints "Canceled" and does not stop the CLI. Own the animation instead of borrowing it, or take
  the handler back after `start()`.
- Two majors: the failure message reaches stdout as well as stderr, and `runProgram` does not
  register the unknown-command fallback, so it is a weaker entry point than `main`.
- The phase stays open: the rest of the steps are untouched.

## Outcome

Done on 2026-10-21. The scanner judges a file by its logical path, the path under `src/`, and a
fixture by the path under `tests/fixtures/architecture/src/`, so a fixture is judged as if it lived at
its mirrored place. The two rules from before and the eight new ones are one table of ten, and each
has a fixture that breaks exactly that rule and nothing else; the architecture test proves that, one
rule at a time.

`src/core/` gained the command runner, the version comparison and the git adapter. The package
facts now reach the CLI through one define, and `src/cli.ts` holds no package literal.

