---
title: Shipped the Dokploy install site
date: 2026-10-19
summary: "Built install.sh, the nginx site image and CI deploy to Dokploy; the site went live and the real install over HTTPS works; the user cut the home to the domain root, no i18n"
---

# Shipped the Dokploy install site

## What happened
Cooked plans/261019-1619-dokploy-install-site/ end to end: `scripts/install.sh` with its install
suite, the nginx site image, the CI `image` and `deploy` jobs, the docs and the four decision
records. The user created the Dokploy Compose service and set `DOKPLOY_WEBHOOK_URL`; run
39233527610 went green in every job and the site answered live. The real
`curl -fsSL https://jss-devtools.jjuidev.com/install.sh | sh` with a throwaway `HOME` installed
`0.0.1`.

## Mid-build amendment (user, 2026-10-19)
The first draft served the home page at `/vi/home` with a 302 from `/`. The user cut it:
"nginx.conf chỉ dùng \"/\", ví dụ yoursite.com không handle gì i18n, /home cả". The home page is now
the domain root, copied into the image as `index.html`, the redirect and `absolute_redirect off`
are gone, and the smoke test asserts `/vi/home` answers 404. Recorded as an amendment in
docs/decisions/0021-temporary-nginx-home-and-install-script-location.md.

## Findings worth keeping
- The 404 right after a webhook deploy was the deploy window, not a bug: Dokploy answers 200 as
  soon as it accepts the deploy, and the container came up about forty seconds later. Verify after
  the container is healthy, not immediately after the POST.
- Dokploy's Auto Deploy toggle reads on in its database for the new service, but the repository has
  no GitHub webhook, so it is inert; the only deploy path is the deploy job's POST. Flagged to the
  user to switch the toggle off so it matches the deployment guide.
- `try_files /index.html =404` inside `location = /` serves the file in the current location
  context, so `/index.html` itself stays 404 and the host keeps exactly four answers.
- GHCR packages started public here (the repo's package settings were already public), so no
  visibility switch was needed before Dokploy could pull.

## Next steps
The release path exists, so a module can ship the moment it is merged to `main`. The core module
layout plan is next; when it adds the first command, delete the zero-command unknown-command
fallback in `src/cli.ts` in the same change.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
