---
id: 0021
title: The home page is a temporary nginx page and install.sh lives in scripts/
status: accepted
date: 2026-10-19
---

# 0021 The home page is a temporary nginx page and install.sh lives in scripts/

## Context

A minimal install site needs one page with the install command on it. The `/vi/home` path of the
first draft came from the `design-system` site, which is a Vite content site with a language segment
and two deploy modes; the user cut it the same day: the home page is the domain root and the host
handles no i18n and no `/home` path at all.

The installer itself is a repository source file, not a deployment artifact. It is written, linted
and tested here, and the image copies it.

## Decision

`/` is a static page served by nginx from `docker/home.html`, copied into the image as
`index.html`. It carries the install command, the Node requirement and the repository link, and no
version text. `install.sh` is `scripts/install.sh` in the repository.

## In the user's words

> "Chỉ để tạm nginx home, install.sh nằm trong scripts/install.sh" (user, 2026-10-19)
>
> "nginx.conf chỉ dùng \"/\", ví dụ yoursite.com không handle gì i18n, /home cả" (user, 2026-10-19)

## Consequences

- The site is one nginx image with no build step. The server never builds anything, so a deploy
  cannot compete with the other services on it for memory.
- The host has exactly four answers: the home page, the installer, the two release files. The 302
  and the `absolute_redirect off` that the first draft needed are gone with it.
- The page carries no version text, so it does not have to change when the version does.
- The page is deliberately minimal and temporary. A content site, more languages and a design
  system would each need their own plan.
- The installer is a source file, so it is linted, shellchecked and tested in this repository
  before any image is built from it.
