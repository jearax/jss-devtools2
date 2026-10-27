# Project roadmap

Status is written from what was observed, never from intent. Anything not started says so.

## Done: Phase 0, source foundation

Plan: [../plans/261019-1055-phase-0-source-foundation/plan.md](../plans/261019-1055-phase-0-source-foundation/plan.md)

- Repository, pinned toolchain, and git hooks. The first commit is the toolchain, the second is the
  CLI entry point.
- A CLI with `-h, --help` and `-v, --version`, a single self-contained `dist/cli.mjs`, and tests for exit
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
- ESLint stayed on 10 because the reference's 9 is end-of-life.

## Done: phase 0 review fixes

Plan: [../plans/261019-1529-phase-0-review-fixes/plan.md](../plans/261019-1529-phase-0-review-fixes/plan.md).
Review: [../plans/reports/code-reviewer-261019-1519-phase-0-and-toolchain-review.md](../plans/reports/code-reviewer-261019-1519-phase-0-and-toolchain-review.md).

- The CLI runs when reached through a symlink, which is how bin shims and installers reach it.
  Before the fix it did nothing and exited 0.
- Type-only imports pass lint and typecheck together; vitest rules stay out of `src/`.
- lint-staged keys no longer overlap, and every tool a hook runs is pinned.
- `.env` variants are ignored; formatting facts shared by Prettier and the editor
  are declared only in `.editorconfig`.
- One Node floor, 24.11.0, and CI runs only that version
  ([decision 0026](./decisions/0026-node-floor-24.md)).

## Done: the install site on Dokploy

Plan:
[../plans/261019-1619-dokploy-install-site/plan.md](../plans/261019-1619-dokploy-install-site/plan.md).
How it runs: [deployment-guide.md](./deployment-guide.md).

- `curl -fsSL https://jss-devtools.jjuidev.com/install.sh | sh` installs the CLI, and
  `https://jss-devtools.jjuidev.com/` answers with a minimal page.
- The installer checks the Node floor, verifies the sha256 and writes the wrapper; the install suite
  runs it against a local release server.
- One nginx image carries the page, the installer and the bundle CI tested. CI smoke-runs every
  route against the container before it pushes, and calls the Dokploy webhook after.

## Done: the terminal UI layer

Report:
[../plans/reports/researcher-261020-0023-tui-framework.md](../plans/reports/researcher-261020-0023-tui-framework.md).

- `@clack/prompts` stays the rendering library, behind `src/core/ui/terminal.ui.ts`.
- The animated primitives fall back to plain lines when the output is piped or in CI, so a captured
  run carries no escape byte, and a failure is rendered on stderr with its fix hint.
- The animated spinner is drawn by the layer, not by clack, because clack's registers global
  process handlers while it runs and one of them turns a failure into exit 0.
- The guard that refuses to prompt without a terminal ships with the first prompt, because a clack
  prompt on a closed stdin never settles.

## Done: the core layout and the doctor command

Decisions:
[0023](./decisions/0023-exit-codes.md),
[0024](./decisions/0024-core-and-command-layout.md).

- `src/` has a shared `core/` and one folder per command under `commands/`, and a file name says what
  the file is: `.command.ts`, `.ui.ts`, `.service.ts`, `.check.ts`, `.adapter.ts`, `.util.ts`,
  `.constant.ts`, `.error.ts`, `.type.ts`.
- The boundaries are rules with a negative fixture each, so a rule that catches nothing is a comment
  rather than a rule.
- The exit codes are 0 and 1. A failed check throws `CliError`, which carries the exit code and the
  fix.
- `jss-devtools doctor` is the first command: it checks the Node version, whether git is installed and
  whether the directory is inside a repository, and each failure carries its fix.
- The package facts reach the CLI through one build define, so `src/cli.ts` holds no package literal.

## Done: the init command scaffold

Plan: [../plans/261022-0225-init-command-scaffold/plan.md](../plans/261022-0225-init-command-scaffold/plan.md).
Decision: [0029](./decisions/0029-shared-command-flags.md).

- `jss-devtools init` exists, with the shared flags `-y, --yes` and `--dry-run` and a help with an
  `Examples` section. It writes nothing yet: every run ends with "Nothing to set up".
- The shared flags are declared once in `src/core/constants/`, so the next command that asks a
  question attaches the same flags. `doctor` asks nothing and has neither.
- The flow that fills `init` is still open, and is drawn in the
  [init flow decision log](../plans/261022-0141-init-flow-discussion/decision-log.md).

## Done: the init node preset

Plan: [../plans/261027-1541-init-node-preset/plan.md](../plans/261027-1541-init-node-preset/plan.md).
Decision: [0030](./decisions/0030-init-node-preset.md); the discussion history is the
[init flow decision log](../plans/261022-0141-init-flow-discussion/decision-log.md).

- `jss-devtools init <dir>` creates a TypeScript node project that installs, lints, typechecks,
  builds and runs (`node dist/main.js`), with git hooks active; `jss-devtools init` sets up an
  existing repository, merging what the user owns and stopping with the owned-file list unless
  `--force`. Every check runs in preflight, before the first write.
- The preset ships ESLint, Prettier, EditorConfig, husky, lint-staged, commitlint and VS Code
  settings, with versions pinned in the CLI by `scripts/pin-node-preset.mjs` and written as caret
  ranges. For pnpm it writes `pnpm-workspace.yaml`; existing mode manages only its `allowBuilds`
  entries, never `strictPeerDependencies` or `engineStrict`.
- `tests/init.e2e.test.ts` proves a created project with each manager on `PATH` (npm and pnpm
  required; yarn 1 and bun skipped where absent), gated behind `INIT_E2E=1` because it installs
  from the registry.

## Not started

Each of these needs its own plan before implementation. Open questions that will shape them are
collected in
[../plans/261019-1050-jss-devtools-rewrite/open-questions.md](../plans/261019-1050-jss-devtools-rewrite/open-questions.md).

| Area             | What it covers                                                  | Open questions |
| ---------------- | --------------------------------------------------------------- | -------------- |
| Toolchain module | Framework presets beyond `node` (`react`, `rn`, `next`, `nest`) | T1 to T5       |
| Harness module   | Managed files, first-run bootstrap, review trigger, curation    | H1 to H12      |
| Cross-cutting    | Which decisions carry over from the old prototype               | X2, X3         |

## Dependencies between these

The core layout came first: the toolchain command needs somewhere to live, and the harness command
needs the same. The zero-command unknown-command fallback in `src/cli.ts` is gone, because `doctor`
is the first command. The release path exists, so a command can ship the moment it is merged to
`main`.

## Not committed to yet

The first-release version number. It is recorded as open rather than assumed here.
