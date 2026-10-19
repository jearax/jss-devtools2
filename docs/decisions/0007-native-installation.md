---
id: 0007
title: Native installation, no npm in CI/CD
status: accepted
date: 2026-10-19
---

# 0007 Native installation, no npm in CI/CD

## Context

The tool is installed with curl, sh or wget rather than from npm. Deploy infrastructure is a VPS
running Dokploy v0.30.8 behind Traefik, with Docker 29 and no GitHub Actions runner on it. CI/CD
therefore has no reason to touch a registry.

## Decision

Distribution is native installation only. Nothing in CI/CD publishes to npm. Deploys go through the
VPS and Dokploy.

## In the user's words

> "CICD không tương tác với NPM nữa, hạ tầng deploy bây giờ là VPS + dokploy ... Chỉ install qua native
> như curl, sh, wget,... thay vì NPM" (user, 2026-10-19)

## Consequences

- The published artifact has no `node_modules`, so the build inlines runtime dependencies and a
  test proves the built file runs on its own.
- `package.json` is marked private and is never published. It exists for the build and for
  contributors.
- The release workflow, checksums, `install.sh` and the install site are not in this plan. Whether
  the artifact is a JS bundle requiring Node or a single executable is still open for that plan.

## Later

The install plan answered the open question: the artifact is a JS bundle that runs on Node, not a
single executable. That is [0018](./0018-javascript-bundle-artifact.md), with the artifact host in
[0019](./0019-artifact-lives-in-the-site-image.md) and the install path itself in
[deployment-guide.md](../deployment-guide.md). A native executable stays possible for a later plan
and would revisit this decision.
