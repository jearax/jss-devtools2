# Deployment guide

How the install site reaches production, and what to do when a deploy misbehaves.

The site is one nginx image on `vps-5890-ci`, pulled by Dokploy and served behind Traefik at
`https://jss-devtools.jjuidev.com`. A green push to `main` publishes the image and redeploys the
site. Nothing on the server builds.

## The pipeline

```
push to main
  -> checks          lint, typecheck, test, build, shellcheck   (exactly engines.node)
  -> image           build the nginx image, smoke it, push to GHCR
  -> deploy          POST the push event to the Dokploy webhook
       -> Dokploy    pull :latest, run it behind Traefik
```

| Job      | Needs    | Runs on main | Does                                                                               |
| -------- | -------- | ------------ | ---------------------------------------------------------------------------------- |
| `checks` | -        | yes          | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, shellcheck on install.sh |
| `image`  | `checks` | yes          | build the image, smoke every route against the container, push to GHCR             |
| `deploy` | `image`  | yes          | call the Dokploy webhook, fail unless it answers 200                               |

A pull request runs the same jobs and builds and smokes the image, but pushes nothing and deploys
nothing. A red run ships nothing new, though Dokploy still restarts the current image (below).

The `image` job loads the image into the runner's Docker daemon instead of pushing it, so the
smoke test runs against the exact bytes that later ship. The push step then tags that same image
`latest` and `sha-<full 40-character commit SHA>` and pushes both.

## What the image carries

The build context is an allow-list (`.dockerignore`), so nothing else in the repository reaches the
server.

| Path in the image                                     | Served at                        | Cache      |
| ----------------------------------------------------- | -------------------------------- | ---------- |
| `/usr/share/nginx/html/index.html`                    | `/`                              | default    |
| `/usr/share/nginx/html/install.sh`                    | `/install.sh`                    | `no-cache` |
| `/usr/share/nginx/html/releases/latest/cli.mjs`       | `/releases/latest/cli.mjs`       | `no-cache` |
| `/usr/share/nginx/html/releases/latest/checksums.txt` | `/releases/latest/checksums.txt` | `no-cache` |

`/` serves the home page, and every other path — including the old `/vi/home` — answers 404. The
host has exactly these four answers and nothing else.

The bundle in the image is the one the `checks` job built and tested, staged
by `scripts/stage-release.mjs` into `release/` with the checksums file the installer verifies it
against. The server never builds anything.

## One-time setup outside this repository

| What                                                  | Where                                  | Why                                                                      |
| ----------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| A Compose service reading `docker/docker-compose.yml` | Dokploy, `https://dokploy.jjuidev.com` | The service is what Dokploy redeploys                                    |
| The GHCR package `ghcr.io/jearax/jss-devtools2`       | GitHub, package settings               | Dokploy pulls it without credentials, so it must be readable anonymously |
| `DOKPLOY_WEBHOOK_URL`                                 | The `main` GitHub environment          | The deploy job posts the push event there                                |

The Compose service reads Git `https://github.com/jearax/jss-devtools2`, branch `main`, compose
path `docker/docker-compose.yml`, through the GitHub App provider. Four fields matter:

- **Auto Deploy is on.** The webhook the deploy job calls answers 400 "Automatic deployments are
  disabled" when it is off (Dokploy v0.30.8, `pages/api/deploy/compose/[refreshToken].ts`).
- **Trigger Type stays "On Push", accepted.** The GitHub App delivers every push to Dokploy on its
  own, without a repository webhook, and deploys each Auto Deploy service whose trigger is "On Push"
  (`pages/api/deploy/github.ts`). So every push deploys twice: once at push time, which restarts
  the previous `latest` because CI has not pushed the new image yet, and once from the deploy job.
  The first one also happens when CI is red. Both pull `latest` when they run, so the site never
  goes back to an older image; the cost is an extra restart. "On Tag" would remove it, since the
  webhook ignores the trigger type; the user chose to keep "On Push" (2026-10-19).
- **The Domains tab is empty.** Routing lives in the compose labels. A domain there would inject a
  second router on the same host.
- **The custom Command is empty.** Dokploy's default `up -d --remove-orphans` is what removes a
  container whose service was renamed.

Dokploy deploys only a GitHub push event for the service's branch, and answers anything else with
301 "Branch Not Match". The deploy job therefore sends its own run's push event, with the
`X-GitHub-Event: push` header, and fails unless Dokploy answers 200.

## The operational invariants

- `pull_policy: always` on the compose service. Without it the redeploy webhook keeps the old
  image.
- The compose service is on the external `dokploy-network`, so Traefik can reach it.
- The Traefik router matches `Host(`jss-devtools.jjuidev.com`)` on the `websecure` entry point with
  the `letsencrypt` resolver, and the service port is 80.
- The base image is `nginx:1.30.6-alpine`, pinned by digest. `nginx -t` runs in the build, so a
  malformed config fails the image build rather than the deploy.
- The server never builds. The image is the artifact host
  ([0019](./decisions/0019-artifact-lives-in-the-site-image.md)).

## Verifying a deploy

```bash
curl -sI https://jss-devtools.jjuidev.com/
curl -sI https://jss-devtools.jjuidev.com/install.sh
curl -sSL https://jss-devtools.jjuidev.com/install.sh | sh
jss-devtools --version
```

The first `curl -fsSL … | sh` on a machine reports the installed version, and the command lands in
`~/.local/bin/jss-devtools`. The first HTTPS request may need a retry: `letsencrypt` issues the
certificate on that first request.

`ci/smoke-site-image.sh IMAGE [VERSION]` proves the same routing table against any image, which is
what the `image` job runs. It needs Docker and Node.

## Rollback

Point `image:` in `docker/docker-compose.yml` at an earlier commit's tag, which carries the full
40-character SHA (`git rev-parse <commit>`), and redeploy:

```yaml
image: ghcr.io/jearax/jss-devtools2:sha-<full commit SHA>
```

Every green push publishes a `sha-<full commit SHA>` tag, so any earlier commit's image is still there. The
alternative is to stop the service in Dokploy. Nothing else on the VPS is touched: the Traefik
router matches only its own host.

Rolling forward is a new push: a green run republishes `latest` and redeploys.

## What a push to main means

A push to `main` is a deploy. CI gates it, so a broken commit never reaches the server, but a
force-push does deploy. The version in `package.json` is `0.0.1` throughout development
([0020](./decisions/0020-version-0-0-1-during-development.md)), so the trigger is a push rather
than a tag, and the image tag `sha-<full commit SHA>` is what a rollback points at.
