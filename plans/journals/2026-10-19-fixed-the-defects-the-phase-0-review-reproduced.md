---
title: Fixed the defects the phase 0 review reproduced
date: 2026-10-19
summary: "Symlinked CLI no longer exits 0 silently; type imports, lint-staged overlap, env ignores, consumer floor and indentation single source fixed"
---

# Fixed the defects the phase 0 review reproduced

## What happened

Reviewed phase 0 and the toolchain alignment on a clean clone, then fixed what the review reproduced.
Plan: plans/261019-1529-phase-0-review-fixes/plan.md. Review:
plans/reports/code-reviewer-261019-1519-phase-0-and-toolchain-review.md.

## Root causes

- `isDirectRun()` compared `process.argv[1]` with `import.meta.filename`. Through a symlink argv[1] is
  the link and the module path is its target, so `main()` never ran: no output, exit 0, including on
  an unknown command. The bundle test ran `node cli.mjs` directly and could not see it.
- `consistent-type-imports` `prefer: no-type-imports` against `verbatimModuleSyntax`: ESLint rejects
  `import type`, tsc rejects the plain import (TS1484). Hidden only because `src/` imported a class.
- lint-staged enables basename matching for a pattern with no `/`, so the root `*.{ext}` key matched
  every source file, overlapped the folder key, and ran two editing chains on one file at once.

## Decisions

- Indentation lives only in `.editorconfig` (decision 0017). User: "tab width cần single trust source
  => delegate full for you."
- Symlink fix is the minimal `realpathSync` plus a test; splitting the entry waits for the core module
  layout plan. User delegated the choice.
- Lint globs kept as they are (user: "Giữ hiện tại"). Only the lint-staged keys were joined.

## Findings worth keeping

- The `consumer-floor` CI step first appeared to pass on the old bundle too. The rebuild had run under
  Node 22.12 on PATH, `devEngines` refused it, and the fixed `dist/` stayed in place. Build with the
  normal runtime, then switch Node only to run the artifact.
- GitHub's default `run` shell is `bash -e` without pipefail, so the step ends each version check with
  `grep`: a silent exit 0 then fails the step.
- `setup-node`'s `node-version-file: package.json` reads `devEngines.runtime` before `engines.node`, so
  it cannot target the consumer floor; the job reads `engines.node` itself.

## Verification

Fresh copy of the working tree: frozen install, lint, typecheck, 15 tests, build, format:check green.
Symlink test fails on the old entry point. The CI step passes on official Node 22.12.0 (checksum
verified) with the fixed bundle and fails with the old one. CI on GitHub not run yet: nothing pushed.

## Next steps

Commit and push, then confirm the `consumer-floor` job on CI. Core module layout plan after that.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
