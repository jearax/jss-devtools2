---
id: 0010
title: New remote jearax/jss-devtools2
status: accepted
date: 2026-10-19
---

# 0010 New remote jearax/jss-devtools2

## Context

The rewrite is not a continuation of the existing `jss-devtools` repository, so it needs its own
remote rather than a new branch series on the old one. On 2026-10-19 `gh repo view` reported that
`jearax/jss-devtools2` did not exist.

## Decision

Create a new GitHub repository at `https://github.com/jearax/jss-devtools2` and push this history to
it. CI runs on GitHub-hosted runners.

## In the user's words

> "Tạo 1 github repo mới `https://github.com/jearax/jss-devtools2` để dùng" (user, 2026-10-19)

## Consequences

- The remote is created without a README or license from GitHub, so the history starts from the
  first real commit rather than a template.
- Public visibility matters later: if `install.sh` downloads GitHub release assets, a private
  repository makes that unauthenticated fetch awkward. This is settled at creation time, not now.
