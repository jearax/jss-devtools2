---
title: "Toolchain alignment"
description: "Bring the repository toolchain up to the design-system baseline, name every config export, and remove the .npmrc and .nvmrc files."
status: completed
priority: P1
effort: "1.5h"
tags: [tooling, foundation, config]
created: 2026-10-19
---

# Toolchain alignment

## Overview

Phase 0 shipped a working but thin toolchain: bare ESLint recommended rules, no editor settings, and
two dotfiles restating facts that belong in files with better tooling support. This plan brings the
repository up to the `@jjuidev/design-system` baseline, since this CLI generates the same toolchain
for consumers and its own repository should be the first strict user of it.

Context: [phase 0 plan](../261019-1055-phase-0-source-foundation/plan.md),
[code standards](../../docs/code-standards.md).

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Every config file exports a named const, not a bare default | P1 |
| 2 | Toolchain matches design-system: tabs, tab size, formatting, VS Code settings | P1 |
| 3 | `.npmrc` and `.nvmrc` removed; each fact declared once | P1 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Config export naming, toolchain completion, dotfile removal](./phase-01-toolchain-and-config.md) | Completed |

One phase rather than three: the three asks touch the same files and had to land together, because
removing `.nvmrc` and adding `.vscode` both depend on the new Prettier and EditorConfig settings.

## Success Criteria

- [x] `eslint.config.mjs`, `commitlint.config.mjs`, `tsdown.config.ts` and `vitest.config.ts` export a named const
- [x] `.editorconfig`, `.prettierrc.json` and `.vscode/settings.json` agree with each other
- [x] `.npmrc` and `.nvmrc` do not exist; their settings live in `pnpm-workspace.yaml` and `package.json`
- [x] `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build` passes
- [x] README, CLAUDE.md and docs describe only what exists
- [x] CI green on the Node 22, 24 and 26 matrix

## Non-goals

- Changing `moduleResolution` from `NodeNext` to the reference's `Bundler`. Recorded as a deliberate
  deviation in decision 0014, because this repository ships a real Node ESM artifact.
- React, CSS, stylelint, Playwright and Tailwind parts of the reference config. This is a Node CLI.
- Any product command.

## Open items raised inside this plan

None. Both decisions the user needed to make were settled before implementation started.

<!-- slug: toolchain-alignment -->