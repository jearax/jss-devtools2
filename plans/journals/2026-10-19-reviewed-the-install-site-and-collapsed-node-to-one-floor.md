---
title: Reviewed the install site and collapsed Node to one floor
date: 2026-10-19
summary: "Review found a double deploy and a 403; the development Node floor was wrong; one floor >=22.22.1 and one CI job replace five"
---

# Reviewed the install site and collapsed Node to one floor

## What happened
Reviewed the install-site ship by re-running everything: gate on a clean clone, shellcheck, live
routes, a real `curl | sh` install, the VPS container and Dokploy's database.

## Findings
- Every push deployed twice. The service uses Dokploy's GitHub App provider, which deploys on push by
  itself; the earlier note that "no repository webhook means no push events" was wrong. Turning Auto
  Deploy off would have broken CI deploys: Dokploy v0.30.8 `compose/[refreshToken].ts:44` answers
  400 when it is off. The fix is Trigger Type "On Tag" in the UI.
- `/releases/latest/` answered 403 (directory without index); now 404, asserted in the smoke test.
- Image tags carry the full commit SHA; docs said `sha-<commit>` and a phase claimed a short tag.
- `devEngines` said `>=22.13.0`, but tsdown needs `^22.18.0` and lint-staged `>=22.22.1`. No job ran
  an old 22 patch, so nothing caught it.
- pnpm 11.24.0 only warns when the running Node misses the project's own `engines.node`; decision
  0015 claimed it always fails. Proven with the official 22.22.0 tarball.

## Decision (user)
One Node floor, `>=22.22.1`, for consumers and development; `devEngines` removed, `engineStrict`
restored; CI runs exactly that version in one job instead of five (decision 0022).

## Next steps
The user sets Trigger Type "On Tag" in Dokploy. Then a force-push of the squashed commit deploys.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
