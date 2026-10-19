---
id: 0018
title: The installed artifact is a JavaScript bundle that runs on Node
status: accepted
date: 2026-10-19
---

# 0018 The installed artifact is a JavaScript bundle that runs on Node

## Context

The install path is `curl -fsSL … | sh`, so the artifact is whatever the installer downloads. Two
shapes were possible: a single native executable, or a JavaScript bundle that needs a Node runtime
beside it.

A native executable would remove the Node requirement from the user's machine entirely. It would also
give up the current build: the bundle is produced by tsdown from `src/cli.ts`, and a native
executable is a different artifact with a different toolchain and a different cross-platform story.

## Decision

The installed artifact is the JavaScript bundle `dist/cli.mjs`, and it runs on Node >= 22.12.0, the
consumer floor from [0006](./0006-consumer-node-floor.md).

## In the user's words

> "JS bundle, cần Node" (user, 2026-10-19)

## Consequences

- The installer checks the Node floor before it downloads anything, and refuses to install on a Node
  below it. The floor is declared in `scripts/install.sh` as `MIN_NODE_VERSION`; a test proves it
  equals `engines.node`, because a served script cannot read the manifest.
- The Node the user runs is the Node the CLI runs on. The site image is a download host, not a
  runtime host, so the image does not carry a Node.
- The bundle is one self-contained file with no `node_modules` beside it, so the build inlines the
  runtime dependencies.
- The wrapper the installer writes runs the file, not a symlink to it, so the CLI never has to
  resolve a link to start.

## Later

The floor is now Node >= 24.11.0 ([0026](./0026-node-floor-24.md)).
