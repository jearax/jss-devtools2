---
phase: 3
title: "CI image, deploy and Dokploy setup"
status: done
priority: P1
effort: "1.5h"
dependencies: [2]
---

# Phase 3: CI image, deploy and Dokploy setup

## Goal
A green push to `main` publishes the image and redeploys the site; a red one changes nothing.

## Context
- `docker/setup-buildx-action` v4.4.1 `f87e5991a6d7451dcb8d9637bfbc97413f497069`,
  `docker/login-action` v4.6.0 `dbcb813823bdd20940b903addbd779551569679f`,
  `docker/build-push-action` v7.4.0 `c3c9e263c25d99ce0380d002d59b67737d91b0dc` (2026-10-19).
- Dokploy deploys only a push event for the service's branch and answers anything else 301
  "Branch Not Match" (`design-system` docs/ARCHITECTURE.md, verified in production there).
- The repo has no GitHub environment and no secret yet (checked 2026-10-19).

## Steps
- [x] `ci.yml` job `image`, needs `checks`, `node-matrix`, `consumer-floor`; `packages: write`.
      Download `cli-bundle` into `bundle/`, stage `release/` with `scripts/stage-release.mjs`, build,
      smoke-run the image (routes, headers, `install.sh` end to end against the container), then
      push `latest` and `sha-<commit>` only on a push to `main`. Pull requests build and smoke
      without pushing. The smoke step is `ci/smoke-site-image.sh`.
- [x] Job `deploy`, needs `image`, push to `main` only, `environment: main`: POST
      `toJSON(github.event)` to `DOKPLOY_WEBHOOK_URL` with `X-GitHub-Event: push`; fail unless 200;
      fail with a clear message when the secret is unset.
- [x] `gh api -X PUT repos/jearax/jss-devtools2/environments/main` (done 2026-10-19).
- [x] Push. Run 39231817863: checks, node-matrix and consumer-floor green; `image` green, so the
      smoke test passed in CI and `ghcr.io/jearax/jss-devtools2:latest` and `:sha-<full 40-character SHA of 4c1192c>` exist and
      pull anonymously (the package is already public, so no GitHub UI step is needed); `deploy`
      failed with the expected "DOKPLOY_WEBHOOK_URL is not set" message.
- [x] Dokploy: Compose service from Git `https://github.com/jearax/jss-devtools2`, branch `main`,
      compose path `docker/docker-compose.yml` — created by the user in the UI (appName
      `jjuidev-jssdevtools-sek4ui`), and the user set `DOKPLOY_WEBHOOK_URL` on the `main`
      environment. Corrected by review: the service uses the GitHub App provider, so Dokploy does
      receive every push and deployed twice per push. Auto Deploy must stay on (the webhook answers
      400 without it). Trigger Type "On Tag" would stop the App's own deploy; the user kept "On
      Push" and accepts two deploys per push (2026-10-19).
- [x] Verify live (run 39233527610, every job green, no re-run needed): the deploy job answered
      `200 {"message":"Compose deployed successfully"}`; on `https://jss-devtools.jjuidev.com`,
      `/` answers 200 `text/html`, `/vi/home` 404, `/install.sh` 200 `text/plain` `no-cache`,
      `/releases/latest/cli.mjs` and `checksums.txt` 200 `no-cache`, `/nope` 404; the container is
      Up (healthy) on the VPS; the real `curl -fsSL …/install.sh | sh` with a throwaway `HOME`
      installed `0.0.1` and `jss-devtools --version` printed `0.0.1`.

## Rollback
Point `image:` in `docker/docker-compose.yml` at `sha-<earlier commit>` and redeploy, or stop the
service in Dokploy. Nothing else on the VPS is touched: the router matches only its own host.

## Risks
- A push to `main` is now a deploy. CI gates it, but force-pushes also deploy.
- `letsencrypt` issues the certificate on first request; the first HTTPS probe may need a retry.
