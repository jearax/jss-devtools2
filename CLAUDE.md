# CLAUDE.md

Guidance for coding agents working in this repository.

## What this repo is

`@jjuidev/jss-devtools`, a rewrite of an existing CLI, built from scratch rather than forked. The
old implementation lives elsewhere and is a source of lessons, not code to copy. The goal and the
non-goals are in [docs/project-overview-pdr.md](./docs/project-overview-pdr.md).

## Commands

```bash
pnpm install
pnpm build        # tsdown -> dist/cli.mjs
pnpm lint         # ESLint, with Prettier as a lint rule
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest; builds the bundle first via globalSetup
pnpm format       # eslint --fix, then prettier --write
pnpm format:check # prettier --check, reporting only
```

## Before claiming something is done

Run the narrowest check that covers the change, then the full sequence before reporting:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

`pnpm lint` covers formatting, so `pnpm format:check` is only needed when you want to check without
writing. Report the command you ran and its real output. A check that was skipped is a limitation to
state, not a result to assume.

## Rules this repo enforces on itself

- **The repo is the authority.** If this file, the docs, or the code disagree with what you were
  told in chat, trust the repository and raise the conflict instead of guessing.
- **A push to `main` deploys.** CI builds the site image, pushes it to GHCR and calls the Dokploy
  webhook. Read [docs/deployment-guide.md](./docs/deployment-guide.md) before pushing, and say what a
  push will do when you report the change.
- **Architecture is tested, not documented.** Boundary rules live in
  [tests/support/architecture-rules.ts](./tests/support/architecture-rules.ts) with a negative
  fixture each. Add a rule and its fixture together. The layout and the role suffixes are in
  [docs/decisions/0024](./docs/decisions/0024-core-and-command-layout.md).
- **Failures stay non-zero.** Only `src/cli.ts` may touch process exit or global process handlers;
  the architecture test enforces this, because the previous release shipped a handler that turned
  crashes into exit 0.
- **One fact, one home.** The version, the dev runtime, the package manager and the bundled
  dependencies are each declared once. Do not add a second copy in a config file; read it from
  `package.json` instead, the way `scripts/package-info.mjs` does. Formatting facts shared by
  Prettier and the editor live only in `.editorconfig`, which both read.
- **Write what exists.** No placeholder markers, no speculative architecture, no stale documents.
  Purge retired design text rather than leaving it where agent retrieval will find it.
- **Raise open questions at the step that blocks them**, one question at a time, with the leaning
  and the reason. Do not batch them up front and do not decide one yourself.
- **Pin what you install.** Every dependency here is pinned to an exact version; the toolchain is
  not allowed to drift on its own.

## Where things are

| Path                        | What                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `src/cli.ts`                | The only entry point: builds the commander program, owns all process-level decisions       |
| `src/core/`                 | Shared code no command owns: the terminal layer, the error type, the exit codes, the utils |
| `src/commands/`             | One folder per command; the file suffix says what the file is                              |
| `tests/`                    | vitest suites; `support/` holds scanners and helpers, `fixtures/` holds negative fixtures  |
| `scripts/install.sh`        | The installer the site serves; POSIX sh, shellchecked in CI, exercised by `tests/`         |
| `scripts/stage-release.mjs` | Stages the built bundle and its checksums into `release/` for the site image               |
| `scripts/package-info.mjs`  | Reads the package facts the CLI is built with, once                                        |
| `docker/`                   | The site image: nginx config, home page, Dockerfile, and the compose file Dokploy runs     |
| `ci/`                       | The smoke test the image job runs against the container                                    |
| `docs/`                     | Project docs and the decision records                                                      |
| `plans/`                    | Plans and research reports. Canonical working state, owned by planning tooling             |

## Config files

There is no `.npmrc` and no `.nvmrc`. pnpm reads its settings from `pnpm-workspace.yaml`, and the
only Node floor is `engines.node` in `package.json`, which `engineStrict` enforces at install.

Every config file assigns to a named const and exports it, so the export line names what it exports:
`export default eslintConfig`, not a bare `export default`. Applies to `eslint.config.mjs`,
`commitlint.config.mjs`, `tsdown.config.ts` and `vitest.config.ts`.

## Docs

- [docs/code-standards.md](./docs/code-standards.md) — formatting, lint, naming, tests, commits
- [docs/system-architecture.md](./docs/system-architecture.md) — entry point, build, test strategy
- [docs/codebase-summary.md](./docs/codebase-summary.md) — the current tree, file by file
- [docs/project-roadmap.md](./docs/project-roadmap.md) — what is done and what is not
- [docs/decisions/](./docs/decisions/) — why each major choice was made, quoting the user

What each piece of work actually found lives in
[plans/journals/](./plans/journals/), one file per plan. Read the journal before the plan: it
records the failures and the measurements that the plan itself does not.

Background research lives in [plans/261019-1050-jss-devtools-rewrite/knowledge-base.md](./plans/261019-1050-jss-devtools-rewrite/knowledge-base.md),
and unresolved questions in
[plans/261019-1050-jss-devtools-rewrite/open-questions.md](./plans/261019-1050-jss-devtools-rewrite/open-questions.md).
Ask a question when the plan reaches the step it blocks, never in a batch up front.
