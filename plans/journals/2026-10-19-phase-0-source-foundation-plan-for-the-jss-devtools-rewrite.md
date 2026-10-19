---
title: Phase 0 source foundation plan for the jss-devtools rewrite
date: 2026-10-19
summary: Foundation questions F1-F12 answered; 4-phase plan to turn yyyy into a clean TS CLI repo
---

# Phase 0 source foundation plan for the jss-devtools rewrite

## What happened
Planned phase 0 of the jss-devtools rewrite in /Users/tandm/Desktop/yyyy (empty workspace, not yet a git repo). Plan: plans/261019-1055-phase-0-source-foundation/plan.md, 4 phases: repository and toolchain, CLI entry point and tests, agent and docs foundation, remote and CI.

## Decisions (user, 2026-10-19; logged in plans/261019-1050-jss-devtools-rewrite/open-questions.md)
- ESLint + Prettier with TypeScript 6.0.x: typescript-eslint 8.71.2 peer range is `>=4.8.4 <6.1.0`, so TypeScript 7.0.2 is not usable with typed linting yet.
- tsdown 0.23 (tsup README says unmaintained); runtime deps inlined with `deps.alwaysBundle` (`noExternal` is deprecated in 0.23).
- commander 15 + @clack/prompts 1.8; Node >=24; vitest 5; pnpm 11.24.0 (dev only).
- Distribution is native (curl/sh/wget), CI/CD never touches npm, deploy via VPS + Dokploy (vps-5890-ci runs Dokploy v0.30.8, no Actions runner). New repo jearax/jss-devtools2 (not created yet).
- Repo uses AgentKit for its own agent setup.

## Process correction
User rejected batch-asking design questions during scouting; open questions now live in a log and are raised at the plan step they block.

## Next steps
- /ak:cook plans/261019-1055-phase-0-source-foundation/plan.md
- Raise at phase 3: decision records location. At phase 4: repo visibility and confirmation before gh repo create.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
