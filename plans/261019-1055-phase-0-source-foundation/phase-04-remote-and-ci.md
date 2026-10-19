---
phase: 4
title: "Remote and CI"
status: completed
priority: P2
effort: "1.5h"
dependencies: [3]
---

# Phase 4: Remote and CI

## Goal
Push the repository to the new GitHub repo `jearax/jss-devtools2` and have GitHub Actions run the same checks that run locally, green on the first push.

## Context
- F11: new repo `https://github.com/jearax/jss-devtools2`. On 2026-10-19 `gh repo view` reported that it does not exist.
- CI only. CD (release, checksums, install.sh, install site on Dokploy) belongs to the release plan. The VPS `vps-5890-ci` runs Dokploy v0.30.8 with Traefik and has no GitHub Actions runner, so CI uses GitHub-hosted runners.
- Reference workflow: `/Users/tandm/Documents/jearax/dokploy/harness/.github/workflows/ci.yml` (actions pinned by SHA, `persist-credentials: false`, read-only `contents` permission, concurrency cancel). Reuse its pattern and re-check the pinned action versions at implementation time.

## Open item raised at this step
- Repository visibility (public or private), and confirmation before creating it. Public matters later if install.sh downloads GitHub release assets.

## Files to create
- `.github/workflows/ci.yml`: on push and pull_request to `main`, `ubuntu-latest`. Job `checks` on Node 24: checkout, setup-node, pnpm/action-setup 11, `pnpm install --frozen-lockfile`, lint, typecheck, test, build. Job `node-matrix` (needs `checks`, `fail-fast: false`) on Node 22, 24, 26: install, `pnpm test` (this includes the bundle test, so the built CLI is proven on every consumer line). Node 22 must be >=22.18 for tsdown, which setup-node `22` satisfies (latest 22.23.3 on 2026-10-19).

## Steps
- [x] Ask about visibility, then `gh repo create jearax/jss-devtools2 --<visibility> --source . --remote origin` (no README or license from GitHub, so history stays clean).
- [x] Write `ci.yml`, commit `ci: run lint, typecheck, test and build`.
- [x] `git push -u origin main`, then `gh run watch` until the run finishes.

## Verification
- `gh run list --repo jearax/jss-devtools2 --limit 1` shows `completed success` for the push to `main`, including the Node 22, 24 and 26 matrix jobs.
- A local run of the same command sequence passes, so CI and local stay identical.

## Risks
- pnpm 11 on CI must match `packageManager`. pnpm/action-setup reads `packageManager` when `version` is omitted, which avoids two sources of truth (verify the action's behavior at implementation time).
