---
title: Planned the Dokploy install site
date: 2026-10-19
summary: "Plan for install.sh, the nginx site image and CI deploy to Dokploy; F7, F8, R1, R2 answered; cook stopped at the user's request"
---

# Planned the Dokploy install site

## What happened
Scouted the Dokploy setup read-only (plans/reports/scout-261019-1611-dokploy-release-and-install-site.md),
then wrote plans/261019-1619-dokploy-install-site/ with four phases. Cook started and was stopped by
the user ("xong plan, not cook") after one file; that draft was moved out of the repo.

## Decisions (user, 2026-10-19)
- F7: install a JS bundle that needs Node, not a single executable.
- R1: the bundle is served from the site image, not GitHub Releases.
- F8: version 0.0.1, kept through development and testing.
- R2: a temporary nginx home page; install.sh lives at scripts/install.sh.
- The design-system compose is a reference only; its micro-frontend modes do not carry over.

## Findings worth keeping
- A fixed version cannot be tagged per release, so with the bundle inside the site image the
  deploy trigger is a green push to main, and rollback is the image tag sha-<commit>.
- jss-devtools.jjuidev.com already resolves through Cloudflare and reaches Traefik; it answers 404
  only because no router matches the host.
- GHCR packages start private and no REST endpoint changes their visibility; the first deploy needs
  a manual switch in the GitHub UI.

## Next steps
Cook the plan when the user asks. Phase 3 needs the user for the Dokploy service and the webhook.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
