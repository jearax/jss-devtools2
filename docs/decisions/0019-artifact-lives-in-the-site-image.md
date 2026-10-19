---
id: 0019
title: The release artifact lives in the site image, not in GitHub Releases
status: accepted
date: 2026-10-19
---

# 0019 The release artifact lives in the site image, not in GitHub Releases

## Context

The installer downloads a bundle and verifies it against a checksums file, so the artifact needs a
host. Two shapes were proven elsewhere in the fleet: the old `harness` project used GitHub Releases
as the artifact host and served only `install.sh` from its site; the `design-system` site image
carries everything it serves.

GitHub Releases would tie the install path to the repository staying public, and it needs a tag per
release. The version is fixed at 0.0.1 during development ([0020](./0020-version-0-0-1-during-development.md)),
so there is no per-release tag to publish.

## Decision

The site image carries the bundle and its checksums, and the installer downloads them from the site
at `/releases/latest/`.

## In the user's words

> "Trong image của site" (user, 2026-10-19)

## Consequences

- The image is the artifact host. CI builds it, Dokploy pulls it, and the bytes the CI tested are
  the bytes the installer downloads.
- The path carries no version segment, because a fixed version cannot be tagged per release. The
  deploy trigger is a green push to `main`, and the rollback is the image tag `sha-<commit>`.
- `latest` moves with every green push to `main`, so it names the current commit rather than a
  version.
- `scripts/stage-release.mjs` writes the bundle and the checksums file into `release/`, which is
  the one place the checksum format `install.sh` reads is defined.
- The repository stays the source of the artifact, and nothing is published to npm.
