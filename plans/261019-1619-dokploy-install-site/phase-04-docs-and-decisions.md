---
phase: 4
title: "Docs and decisions"
status: done
priority: P2
effort: "1h"
dependencies: [3]
---

# Phase 4: Docs and decisions

## Goal
Docs describe the install path and the deploy as they exist, and each answer is a decision record.

## Files
- Create `docs/deployment-guide.md`: the pipeline, the one-time Dokploy and GitHub setup, rollback,
  the operational invariants, and how to verify a deploy.
- Create decision records, one per answered question, quoting the user: F7 (JS bundle), R1 (bundle
  in the site image), F8 (0.0.1 during development), R2 (temporary nginx home, `scripts/install.sh`).
- Modify `README.md` (install section, now that one exists), `CLAUDE.md` (a push to `main` deploys),
  `docs/codebase-summary.md`, `docs/system-architecture.md`, `docs/project-roadmap.md`,
  decision 0007 (a "Later" pointing at the F7 record), and
  `plans/261019-1050-jss-devtools-rewrite/open-questions.md` (F7, F8, R1, R2 answered; X3 open).

## Verification
- [x] Relative links resolve; no TBD; `pnpm format:check` and `pnpm lint` green.
- [x] Every claim in `deployment-guide.md` was observed in phase 3, not assumed: the routes, the
      cache headers, the healthy container and the end-to-end install over HTTPS.
