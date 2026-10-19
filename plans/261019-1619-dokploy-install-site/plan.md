---
title: "Install site on Dokploy"
description: "Serve install.sh, the CLI bundle and a minimal home page at jss-devtools.jjuidev.com, deployed by CI to Dokploy on every green push to main."
status: done
priority: P1
effort: 5h
branch: main
tags: [infra, release, dokploy, ci]
blockedBy: []
blocks: []
created: 2026-10-19
---

# Install site on Dokploy

## Overview

`curl -fsSL https://jss-devtools.jjuidev.com/install.sh | sh` installs the CLI, and
`https://jss-devtools.jjuidev.com/` answers with a minimal page. One nginx image carries
the page, `install.sh` and the bundle CI already tested; CI pushes it to GHCR and triggers Dokploy
on `vps-5890-ci`, which pulls and runs it behind Traefik. The VPS never builds.

Context: [Dokploy scout](../reports/scout-261019-1611-dokploy-release-and-install-site.md).
The `design-system` compose is a reference only, not a template: it is a micro-frontend with two
deploy modes and path routing on `jjuidev.com`, none of which applies here (user, 2026-10-19).
What carries over are its operational invariants: `pull_policy: always`, the webhook carrying the
push event, routing in compose labels, the server never building.

## Inputs fixed by the user (2026-10-19)

| Question | Answer |
|---|---|
| F7 What `install.sh` installs | "JS bundle, cần Node": `dist/cli.mjs` plus a wrapper, Node >=22.12 required |
| R1 Where the bundle is hosted | "Trong image của site": served by the site, not GitHub Releases |
| F8 Version | "0.0.1, và cũng sẽ giữ 0.0.1 mãi trong quá trình dev / test" |
| R2 The home page | "Chỉ để tạm nginx home, install.sh nằm trong scripts/install.sh" |

Consequence of F8 with R1: a fixed version cannot be tagged per release, so the trigger is a green
push to `main`, not a tag. The image carries the bundle built from that commit. Rollback is the
image tag `sha-<commit>`.

## Phases

| # | Phase | Effort | Depends on | Status |
|---|---|---|---|---|
| 1 | [install.sh and its tests](./phase-01-install-script.md) | 1.5h | - | done |
| 2 | [Site image](./phase-02-site-image.md) | 1h | 1 | done |
| 3 | [CI image, deploy and Dokploy setup](./phase-03-ci-and-dokploy.md) | 1.5h | 2 | done |
| 4 | [Docs and decisions](./phase-04-docs-and-decisions.md) | 1h | 3 | done |

## Architecture

```
push to main
  -> checks (Node 24) -- uploads cli-bundle --+
  -> node-matrix 22/24/26, consumer-floor      |
  -> image: download cli-bundle, sha256, docker build docker/Dockerfile
            smoke-run the image: routes, headers, install.sh end to end
            push ghcr.io/jearax/jss-devtools2:latest and :sha-<commit>   (push to main only)
  -> deploy: POST push event to DOKPLOY_WEBHOOK_URL, require HTTP 200   (push to main only)
       -> Dokploy compose (docker/docker-compose.yml): pull :latest, run nginx
            -> Traefik Host(`jss-devtools.jjuidev.com`), websecure, letsencrypt
```

| Path | Serves |
|---|---|
| `/` | Minimal HTML: the install command, the Node requirement, the repo link; no version text |
| `/install.sh` | `scripts/install.sh`, `text/plain`, `no-cache` |
| `/releases/latest/cli.mjs`, `/releases/latest/checksums.txt` | The bundle tested by this run's CI, `no-cache` |
| anything else, including `/vi/home` | 404 |

## Acceptance criteria

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green; the install suite runs `install.sh`
  against a local server and then runs the installed `jss-devtools --version`.
- `install.sh` passes shellcheck as POSIX sh, refuses Node below the floor, refuses a checksum
  mismatch, and leaves nothing behind on failure. A test keeps its Node floor equal to
  `engines.node`.
- The image builds from a pinned `nginx` tag and digest, `nginx -t` runs in the build, and a CI
  smoke test proves every row of the routing table above.
- After the first green push: `curl -fsSL https://jss-devtools.jjuidev.com/install.sh | sh` in a
  throwaway `HOME` installs a CLI whose `--version` prints `0.0.1`, and `/` answers 200 over HTTPS.
- A push whose CI fails deploys nothing.

## Non-goals

A content site, i18n, versioned download paths, an uninstall command, Windows, GitHub Releases, npm.

## Open items raised inside this plan

- At phase 3: the one-time Dokploy and GitHub setup needs the user's hands (Dokploy UI, GHCR package
  visibility), and pushing to `main` deploys. Both are asked at that step.
- At phase 4: X3, the old `harness.jjuidev.com` site and `jearax/harness`, stays open; this plan does
  not touch them.
