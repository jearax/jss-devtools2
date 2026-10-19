---
title: Cooked the core and command layout, and the doctor command
date: 2026-10-21
summary: "Shipped the src/commands layout with role suffixes and ten architecture rules that each have a negative fixture, the doctor command with three checks and a fix hint, and one build define that carries the package facts into the CLI"
---

# Cooked the core and command layout, and the doctor command

## What happened

The [core layout plan](../261020-0017-core-module-layout/plan.md) was cooked: `src/` now has
a shared `core/` and one folder per command under `commands/`, a file name says what the file is,
and the architecture suite expresses ten rules, each with a negative fixture that breaks exactly that
rule. `jss-devtools doctor` is the first command: it checks the Node version, whether git is
installed and whether the directory is inside a repository, and each failure carries its fix.

The delivery step, the amend and the push, is not authorized yet; nothing is committed.

## Findings
- **The plan changed under the cook.** The reviewer moved the folder from `src/modules/` to
  `src/commands/` and renamed three rule ids, with the user's own words as the reason: "IMHO, i think
  `src/modules` -> `src/commands`". The first version of this cook shipped `src/modules/`, and it
  was renamed to match. The rule ids are `core-imports-no-command`,
  `command-imports-no-other-command` and `commander-in-command-files-only`.
- **`check` needs the content, not only the path.** `command-imports-no-other-command` has to know
  which command the importing file is in *and* read the import specifier, so the path rule takes
  `(logicalPath, content)`. The plan wrote `check(path)`.
- **The shared package reader had to be a real `.mjs` file.** tsdown loads its config with Node's own
  loader, and that resolver does not rewrite a `.js` specifier to a `.ts` file, so a `.ts` module
  would not load there. `scripts/package-info.mjs` with `scripts/package-info.d.mts` for its types
  works in every loader.
- **A fixture has to live where its rule expects it.** The mirrored tree is
  `tests/fixtures/architecture/src/`, and the two old fixtures moved under `commands/doctor/`,
  because that is where the suffix table allows a `.service.ts`.
- **Commander names an unknown command once a subcommand exists.** The fallback in `src/cli.ts` was
  deleted and the existing test stayed green without a change.
- **A bare `jss-devtools` now exits 1.** Commander shows the help on stderr when a subcommand is
  required, and marks that help as an error help, so the banner does not open it. The same rule the
  banner plan set for the help after a usage error, so the two agree.

## Decision

The plan's Output block has no spinner line, but the step asks for the layer's spinner. The command
uses it, and it covers the run of the checks, so the output has one progress line in front of the
results. A failed check is a result and not an exception, so the service runs every check and the
command renders them all; the count of failures is what the `CliError` carries.

## Also
- `src/cli.ts` holds no package literal. The name, the description, the version and the Node floor
  reach it through one build define, and the banner builds its info from the same place.
- `showBanner()` takes no info any more: the info is built once, in `banner.ui.ts`.
- The bundle grew from 112.34 kB to 119.00 kB. The doctor command and the layer it renders through
  are most of it.
- The gate is green on Node 22.22.1: lint, typecheck, 86 tests, build, format.

## Review round

The reviewer found
[the review](../reports/code-reviewer-261021-1122-doctor-review.md) and the findings went back to
the cooker. What changed:

- **A git that fails reported as installed.** Only `ENOENT` became "missing", so a git that exits
  non-zero produced an empty detail and a passing check. The adapter now returns one of three
  results, and any exit other than 0 fails the check.
- **`git --version` ran twice.** The version probe runs once, before the checks, and its result is
  in the context. The repository check reads that result, so a missing git is reported once and the
  skipped check carries no hint.
- **The bare run.** Commander exits 1 when a subcommand is required, so the bare run took the help
  path itself: the help on stdout, the banner on a terminal, exit 0.
- **The output.** The spinner line reads "The checks are done", and the final `CliError` carries no
  hint, because the per-check hints above it already say what to do.
- **Comments.** The bar is now strict: the default is no comment, and a comment survives only when
  removing it would likely cause a wrong change. The whole repository was rescanned under it.

The gate is green on Node 22.22.1: lint, typecheck, 90 tests, build, format.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
