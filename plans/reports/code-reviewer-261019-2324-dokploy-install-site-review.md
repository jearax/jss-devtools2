# Review: Dokploy install site (16c1674..0c42e31)

Scope: 6 commits on `origin/main`, plan `plans/261019-1619-dokploy-install-site/`. Everything below
was re-run by the reviewer, not read from the cook report.

## Verified green

- Clean clone of `0c42e31`: `pnpm lint`, `typecheck`, `test` (4 files, 19 tests), `build`,
  `format:check` all green.
- shellcheck v0.11.0 (the digest CI pins), `--shell=sh`: `scripts/install.sh` and
  `ci/smoke-site-image.sh` clean.
- Live `https://jss-devtools.jjuidev.com`: `/` 200 html; `/install.sh` 200 `text/plain` `no-cache`;
  `cli.mjs` and `checksums.txt` 200 `no-cache`; `/vi/home`, `/index.html`, `/nope` 404; HTTP 301 to
  HTTPS; Cloudflare `cf-cache-status: DYNAMIC` on all.
- Live `checksums.txt` sha256 equals the bundle built from the clean clone byte for byte.
- Real `curl -fsSL …/install.sh | sh` with a throwaway `HOME`: installs `0.0.1`, `--version` exit 0,
  unknown command exit 1.
- VPS: `jss-devtools-web` Up (healthy), image digest `7ba5ddca…` matches GHCR `latest`.
- CI has `concurrency` per ref with cancel-in-progress, so two quick pushes cannot publish
  `latest` out of order.

## Findings

### 1. High: every push deploys twice, and the documented fix would break deploys

Evidence:
- Dokploy row `jjuidev-jssdevtools-sek4ui`: `sourceType=github`, GitHub App provider attached,
  `autoDeploy=true`, `triggerType=push`.
- Deployments for push `0c42e31`: 16:21:11Z (same second the CI run was created, before the image
  existed) and 16:22:49Z (the CI deploy job). Every earlier push shows the same pair.
- Dokploy v0.30.8 `pages/api/deploy/github.ts:280-285`: the GitHub App handler deploys every compose
  with `autoDeploy=true AND triggerType='push'` on the branch. A repo webhook is not needed; the
  cook's note "the repository has no GitHub webhook, so Dokploy never receives push events" is wrong.
- `pages/api/deploy/compose/[refreshToken].ts:44`: the webhook CI calls answers 400 when
  `autoDeploy` is false. So `docs/deployment-guide.md` "Auto Deploy is off" is false, and following
  it (as the cook advised the user) stops every CI deploy.

Effect today: the first deploy restarts the container on the previous `latest`, so the content is
right but there are two restarts per push, and a red run still restarts the site, contrary to
"A red run changes nothing on the server".

Fix (UI, no code): keep Auto Deploy on, set Compose → General → GitHub provider → Trigger Type to
"On Tag" (`save-github-provider-compose.tsx`). The App handler then ignores branch pushes; the
refresh-token handler does not read `triggerType`, so CI deploys keep working. Side effect: pushing a
git tag deploys the current `latest`, which is harmless. Then correct the guide, phase 3 and the
journal.

### 2. Low: `/releases/latest/` answers 403, not 404

`location /releases/latest/` has no `try_files`, so nginx tries a directory index, finds none
(autoindex off) and answers 403. This contradicts "exactly four answers". Fix: `try_files $uri =404;`
in that location plus a smoke assertion. `/releases/latest` without the slash is already 404.

### 3. Low: image tag is the full SHA, docs say `sha-<commit>`

CI pushes `sha-${{ github.sha }}` (40 chars). `sha-0c42e31` does not exist; the full form does.
Phase 3 states `:sha-4c1192c` exists, which is false. Recommended: keep the full SHA, say "full
40-character commit SHA" in the guide's rollback section.

### 4. Low: the push event travels as one env var

`PUSH_EVENT: ${{ toJSON(github.event) }}` is one environment string, capped by Linux
`MAX_ARG_STRLEN` (128 KiB). A large push payload would fail the deploy with "Argument list too
long". Same pattern as design-system; acceptable now, worth a `jq`-built minimal payload (`ref`,
`head_commit`, `commits[].added|modified|removed`) if it ever trips.

## Not defects

- Checksums come from the same origin as the bundle: they catch corruption and truncation, not a
  compromised origin. Expected for this design; signing would be new scope.
- Install layout `~/.jss-devtools/<version>/cli.mjs` differs from the plan's `<home>/cli.mjs`, but
  README documents it, and `is_version` keeps the path safe.
- `gh run view 39284760387` still reports `queued`, though its deploy job logged
  `200 {"message":"Compose deployed successfully"}` and Dokploy recorded it; a GitHub API lag.

## Unresolved questions

- Apply finding 1 by Trigger Type "On Tag" (recommended), or switch the source to plain Git?
- design-system has the same row shape (`github`, App, `autoDeploy=true`), so it probably deploys
  twice too; out of scope here.

## Resolution (2026-10-19)

- Finding 1: `docs/deployment-guide.md` and phase 3 now say Auto Deploy on, Trigger Type "On Tag".
  The Trigger Type change itself is a Dokploy UI step for the user; the database still read `push`
  when this was written.
- Finding 2: fixed with `try_files $uri =404;`; the smoke test now asserts `/releases/latest/` is 404
  and fails against the previous image with "answered 403, expected 404".
- Finding 3: docs name the tag as the full 40-character SHA.
- Finding 4: unchanged, as recommended.
- Finding 1, later the same day: the user kept Trigger Type "On Push" and accepts two deploys per
  push; the deployment guide now says so.
