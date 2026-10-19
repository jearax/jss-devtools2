---
phase: 2
title: "Site image"
status: done
priority: P1
effort: "1h"
dependencies: [1]
---

# Phase 2: Site image

## Goal
One nginx image serving the routing table in [plan.md](./plan.md), plus the compose file Dokploy
runs.

## Context
- Base: `nginx:1.30.6-alpine` (stable line, nginx.org 2026-10-19), pinned with digest
  `sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5`.
- The image copies an already-built bundle from the build context; it never runs pnpm. The bundle
  shipped is the one CI tested.
- `design-system` compose invariants kept: external `dokploy-network`, `pull_policy: always`,
  Traefik labels (`websecure`, `letsencrypt`, service port 80), `wget` healthcheck,
  `restart: unless-stopped`.

## Files
- Create `docker/Dockerfile`, `docker/nginx.conf`, `docker/home.html`, `docker/docker-compose.yml`,
  `.dockerignore` (allow-list: `docker/`, `scripts/install.sh`, `release/`).
- Modify `.gitignore` (`release/`, the staging directory for the image build).

## Steps
- [x] `docker/nginx.conf`: `location = /` serves the home page (`try_files /index.html =404`, so
      `/index.html` itself stays 404); `location = /install.sh` `text/plain` +
      `Cache-Control: no-cache`; `location /releases/latest/` `no-cache`; `location /` 404.
      `server_tokens off`. Amended the same day per the user: no 302, no `/vi/home`, no i18n — the
      first draft's redirect and `absolute_redirect off` are gone.
- [x] `docker/home.html`: install command, Node >=22.12 requirement, link to the repo. No version
      text in the HTML: the version is in `/releases/latest/checksums.txt` and `--version`. Copied
      into the image as `index.html`.
- [x] `docker/Dockerfile`: copy config, page (as `index.html`), `install.sh`, `release/` into
      `/usr/share/nginx/html/…`; `RUN nginx -t`.
- [x] `docker/docker-compose.yml`: service `jss-devtools-web`, image
      `ghcr.io/jearax/jss-devtools2:latest`, host `jss-devtools.jjuidev.com`, healthcheck on `/`.
- [x] Local smoke: stage `release/` from `pnpm build` (`pnpm stage:release`), `docker build`, run,
      probe each route and header, then run `install.sh` from the container against it. The
      allow-list `.dockerignore` was proven with a `COPY . /ctx` probe: only `docker/`,
      `scripts/install.sh` and `release/` reach the context. Re-run green after the home-page
      amendment: `/` 200 `text/html`, `/vi/home` 404.

## Verification
- Every routing-table row answers as specified from a locally running container.
- `install.sh` served by the container installs a CLI that prints `0.0.1`.
