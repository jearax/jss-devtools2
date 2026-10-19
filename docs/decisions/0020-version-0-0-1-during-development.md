---
id: 0020
title: The version stays 0.0.1 through development and testing
status: accepted
date: 2026-10-19
---

# 0020 The version stays 0.0.1 through development and testing

## Context

The rewrite needed a version number for its first release. `0.x` allows breaking changes without a
promise, and `0.0.1` says "not finished yet" more honestly than `0.1.0` does.

A versioned download path would need a tag per release, which a version that never changes cannot
provide.

## Decision

`package.json` carries `0.0.1`, and it stays there while the rewrite is developed and tested. The
site does not print a version: `--version` and `/releases/latest/checksums.txt` carry it.

## In the user's words

> "0.0.1, và cũng sẽ giữ 0.0.1 mãi trong quá trình dev / test" (user, 2026-10-19)

## Consequences

- The install path is the same in development and in production, so there is no "latest release" to
  point at and no version to pass to the installer.
- The deploy trigger is a green push to `main`, not a tag. This follows from
  [0019](./0019-artifact-lives-in-the-site-image.md).
- The number changes when the first real release is cut, and that release needs a plan of its own:
  a tag, a versioned path and a version that moves.
