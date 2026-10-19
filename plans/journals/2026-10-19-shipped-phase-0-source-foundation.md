---
title: Shipped phase 0 source foundation
date: 2026-10-19
summary: "Toolchain, CLI entry point, tests, docs, decisions and CI all landed; remote jearax/jss-devtools2 created public and green on first push"
---

# Shipped phase 0 source foundation

## What happened
Executed plans/261019-1055-phase-0-source-foundation in full, 4 phases, 4 commits on main.

Phase 1 repository and toolchain: git init, pinned every toolchain dependency to an exact version, created the config set (tsconfig NodeNext strict, tsdown, eslint flat, prettier, husky, lint-staged, commitlint, vitest). First commit chore: initialize repository and toolchain.

Phase 2 cli entry point and tests: src/cli.ts with createProgram/main/reportFatalError, plus cli, bundle and architecture suites, 15 tests. Second commit feat: add cli entry point with help and version.

Phase 3 agent and docs foundation: ak init registered the project, wrote README, CLAUDE.md and six docs plus 12 decision records. Third commit docs: add agent setup, readme and project docs.

Phase 4 remote and ci: wrote ci.yml, created jearax/jss-devtools2 as a public repo, pushed. All four CI jobs green on the first push. Fourth commit ci: run lint, typecheck, test and build.

## Decisions
- pnpm/action-setup v6 is superseded for pnpm v11+; used pnpm/setup v3 instead, which also installs the Node runtime, so actions/setup-node is no longer needed. Actions pinned by SHA.
- Decision records live in docs/decisions/NNNN-<slug>.md (user, 2026-10-19).
- jearax/jss-devtools2 is a public repository (user, 2026-10-19).
- Remote uses the machine's git@github.com-jearax SSH alias, not github.com, because only the alias has a usable key here.

## Findings worth keeping
- Commander 15 only reports an unknown command, and only suggests a correction, once the command has subcommands. With zero product commands the root reports "too many arguments" instead. Fixed with a command:* handler in src/cli.ts that delegates to commander once commands exist, so no suggestion text is emitted today. The plan acceptance criterion asking for a suggestion cannot be met until the first product command exists.
- CommanderError carries the intended exit code. main() must honour it, otherwise --help and --version would exit 1 through the top-level catch.
- pnpm 11 writes a supply-chain age allow-list into pnpm-workspace.yaml for freshly published packages; commitlint was newer than the default window.
- Prettier's Markdown table realignment rewrites every cell, so plans/ is excluded from formatting.

## Verification
- Clean clone: pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build, all green.
- dist/cli.mjs runs from an OS temp directory with no node_modules; --version prints 0.0.0, an unknown command exits 1.
- Architecture test fails on a temporary process.exit(0) added under src/ and passes once reverted.
- commitlint rejects a non-conventional message and accepts a conventional one, in the working tree and in a fresh clone.

## Next steps
- Next plan: core module layout. X1 (exit codes) and X2 (which old decisions carry over) are open and shape it.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
