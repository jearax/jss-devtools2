# Scout: Dokploy deploy pattern for the release and install site

Read-only scout, 2026-10-19, for the future release plan. Nothing was built or deployed. The user
said CI/CD comes later: "Hiện tại, tôi đang tính CICD tính sau nên chưa takecare nó."

Target the user named: `curl -fsSL https://jss-devtools.jjuidev.com/install.sh | sh`, and a site
at `https://jss-devtools.jjuidev.com/vi/home`.

## Live state

| Probe | Result |
|---|---|
| `jss-devtools.jjuidev.com` DNS | Resolves to Cloudflare (104.21.81.178, 172.67.145.138), same as `design-system.jjuidev.com` |
| `https://jss-devtools.jjuidev.com/vi/home`, `/install.sh` | 404: the request reaches Traefik, but no router matches the host |
| `https://jjuidev.com/` | 200 |
| `https://design-system.jjuidev.com/` | 302 to `/vi/home` |
| `https://harness.jjuidev.com/install.sh` (H0's install site) | 404; no `harness-install` container on the VPS |
| `gh api repos/jearax/harness/releases` | 404 |

`vps-5890-ci` containers: Dokploy v0.30.8 with postgres and redis, Traefik v3.6.7, the two
`design-system` services (images from `ghcr.io/jearax/design-system`), `jjuidev-home-web` and
`jearax-home-web` (`nginx:alpine`), and the mail stack. Traefik host rules come from container
labels: `jjuidev.com`, `www.jjuidev.com`, `design-system.jjuidev.com`, `jjuidev.com/design-system/*`,
`jearax.site`, `www.jearax.site`, `mail.jjuidev.com`.

## Pattern in `design-system` (the reference the user named)

Source: `/Users/tandm/Documents/jearax/dokploy/design-system`, `docs/ARCHITECTURE.md` "Deployment",
`docker/`, `.github/workflows/ci.yml`.

1. CI `test` job, then an `image` job builds `docker/Dockerfile` on GitHub runners and pushes
   `ghcr.io/jearax/design-system:<mode>` and `:<mode>-<sha>`. Pull requests build without pushing.
2. A `deploy` job, only on push to `main`, in the GitHub `main` environment, POSTs the run's own
   push event to the `DOKPLOY_WEBHOOK_URL` secret with `X-GitHub-Event: push`, and fails unless
   Dokploy answers 200. Dokploy answers 301 "Branch Not Match" to anything that is not a push of the
   service's branch.
3. Dokploy runs a Compose service that reads `docker/docker-compose.yml` from the repo: services on
   the external `dokploy-network`, `pull_policy: always` (otherwise the webhook keeps the old image),
   Traefik labels with `websecure` and the `letsencrypt` resolver, a `wget` healthcheck.
4. The server never builds. The image is `nginx:alpine` serving the static build, with
   `nginx -t` run inside the image build.
5. One-time setup outside the repo: the GHCR package must be public, so Dokploy pulls without
   credentials; Auto Deploy is off, because GitHub's push arrives before CI has pushed the image;
   the service's custom Command and Domains tab stay empty, because routing lives in the labels.
6. Rollback: point `image:` at an earlier `<mode>-<sha>` tag and redeploy.
7. The build image is `ghcr.io/pnpm/pnpm:<packageManager version>` with Node from
   `pnpm runtime set node 24 -g`, not Corepack.

## Prior art in H0 (`/Users/tandm/Documents/jearax/dokploy/harness`)

- `release.yml` on a `v*` tag: a read-only `build` job runs the full gate and uploads the bundle;
  a `release` job with `contents: write` installs nothing, checks that tag, `package.json` and
  `--version` agree, writes `checksums.txt` with sha256, and runs `gh release create` as a normal
  release, because `/releases/latest/download` skips prereleases and `install.sh` depends on it.
- `install-site.yml` runs shellcheck on `install.sh`, builds the nginx image, and probes it:
  `install.sh` served as `text/plain` with `no-cache`, `/` answers 404, and the served script is
  byte-identical to the file in the repo.
- `deploy/install-site/`: `nginx:alpine` serving one file; compose with a Traefik rule for
  `harness.jjuidev.com`. Unlike `design-system`, it uses `build: .`, so the VPS builds it.
- `install.sh` (165 lines, POSIX sh): checks Node >= 24, downloads `harness.mjs` from
  `releases/latest/download` (overridable base URL), verifies sha256, runs `--version`, and writes a
  `#!/bin/sh` wrapper `exec node <path>/harness.mjs "$@"` into the bin directory, with an uninstall
  path.

## What this means for jss-devtools

- The pieces exist and are proven on this VPS: GHCR image, webhook deploy, Traefik labels, a
  verified `install.sh`. The release plan can combine them rather than design from scratch.
- Two serving models need a choice: GitHub Releases host the artifact and the site serves only
  `install.sh` (H0), or the site image also carries the artifact. The first keeps checksums and
  versions on GitHub, but `jearax/jss-devtools2` would then have to stay public (decision 0013).
- `/vi/home` implies a content site with a language segment, like `design-system`, not only an
  nginx serving one file. That is a bigger piece of work than H0's install site.
- An installer that writes a wrapper script avoids the symlink case, but `pnpm`/`npm` bin shims and
  manual `ln -s` still hit it, so the `realpathSync` fix and its test stay relevant.

## Unresolved questions

Logged in `plans/261019-1050-jss-devtools-rewrite/open-questions.md`, to be asked at the release
plan's blocking steps:

- F7: ship a JS bundle that needs Node, or a single executable. This decides most of `install.sh`.
- F8: first release version.
- X3: what happens to `jearax/harness` and `harness.jjuidev.com`.
- R1 (new): where the artifact is hosted, GitHub Releases or the site image.
- R2 (new): what `/vi/home` is: a full content site in the `design-system` style, or a minimal page.
