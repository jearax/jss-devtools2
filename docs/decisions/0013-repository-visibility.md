---
id: 0013
title: jss-devtools2 is a public repository
status: accepted
date: 2026-10-19
---

# 0013 jss-devtools2 is a public repository

## Context

Decision 0010 chose the new remote but left visibility open. The deciding factor is decision 0007:
installation is native, through curl, sh or wget. If `install.sh` downloads release assets from
GitHub, a private repository turns that into an unauthenticated fetch that fails for every user who
does not have a token.

## Decision

`jearax/jss-devtools2` is created as a public repository.

## In the user's words

> "Public (Recommended)" (user, 2026-10-19), choosing the recommended option.

## Consequences

- `install.sh` can download release assets with a plain `curl`, with no token in the install path.
- The source is public. This is accepted; nothing planned for this repository is confidential.
- The trade-off returns if the project ever needs secrecy. Reversing it means changing the
  repository setting and rethinking the install path at the same time.
