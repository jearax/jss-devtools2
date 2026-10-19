# Project roadmap

Status is written from what was observed, never from intent. Anything not started says so.

## Done: Phase 0, source foundation

Plan: [../plans/261019-1055-phase-0-source-foundation/plan.md](../plans/261019-1055-phase-0-source-foundation/plan.md)

- Repository, pinned toolchain, and git hooks. The first commit is the toolchain, the second is the
  CLI entry point.
- A CLI with `--help` and `--version`, a single self-contained `dist/cli.mjs`, and tests for exit
  codes, the standalone bundle and the first architecture rules.
- This documentation set and the decision records.

## Done: toolchain alignment, then the review that followed

Plan:
[../plans/261019-0625-toolchain-alignment/plan.md](../plans/261019-0625-toolchain-alignment/plan.md).
Journal for the ten commits after it:
[../plans/journals/2026-10-19-reviewed-toolchain-and-cut-comment-load.md](../plans/journals/2026-10-19-reviewed-toolchain-and-cut-comment-load.md).

- The toolchain follows the `design-system` reference, with the deviations that reference has
  since fallen behind recorded in decisions 0014 and 0015.
- One source file expression, stated once and derived rather than restated, shared by the ESLint
  config, the lint scripts, lint-staged and tsconfig.
- Config files carry no comments that restate their contents, and code comments only where the
  code does not already say it.
- ESLint stayed on 10 because the reference's 9 is end-of-life. The development Node floor is
  22.13 and the consumer floor 22.12, which are different facts set by different packages.

## Done: phase 0 review fixes

Plan: [../plans/261019-1529-phase-0-review-fixes/plan.md](../plans/261019-1529-phase-0-review-fixes/plan.md).
Review: [../plans/reports/code-reviewer-261019-1519-phase-0-and-toolchain-review.md](../plans/reports/code-reviewer-261019-1519-phase-0-and-toolchain-review.md).

- The CLI runs when reached through a symlink, which is how bin shims and installers reach it.
  Before the fix it did nothing and exited 0.
- Type-only imports pass lint and typecheck together; vitest rules stay out of `src/`.
- lint-staged keys no longer overlap, and every tool a hook runs is pinned.
- `.env` variants are ignored; formatting facts shared by Prettier and the editor
  are declared only in `.editorconfig`.
- The consumer floor, Node 22.12.0, is exercised by CI on the shipped bundle.

## Not started

Each of these needs its own plan before implementation. Open questions that will shape them are
collected in
[../plans/261019-1050-jss-devtools-rewrite/open-questions.md](../plans/261019-1050-jss-devtools-rewrite/open-questions.md).

| Area                     | What it covers                                                                                | Open questions |
| ------------------------ | --------------------------------------------------------------------------------------------- | -------------- |
| Core module layout       | Where `core`, `commands` and `modules` live, and what may import what                         | X2             |
| Toolchain module         | The `init` command, framework presets, the version table                                      | T1, T2, T3, T4 |
| Harness module           | Managed files, first-run bootstrap, review trigger, curation                                  | H1 to H12      |
| Release and installation | First-release version, release workflow, checksums, `install.sh`, the install site on Dokploy | F8, X3         |
| Cross-cutting            | Exit-code scheme, which decisions carry over from the old prototype                           | X1, X2, X3     |

## Dependencies between these

The core module layout comes first: the toolchain module needs somewhere to put commands, and the
harness module needs the same. When it adds the first command, the zero-command unknown-command
fallback in `src/cli.ts` stops being registered and should be deleted in the same change. The release plan comes last, because there is nothing to install
until the toolchain module exists.

## Not committed to yet

The first-release version number, and the shape of the module layout. Both are recorded as open
rather than assumed here.
