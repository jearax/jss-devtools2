---
title: "CLI banner"
description: "A JSS block-letter banner with an info column and a cyan-to-magenta gradient, shown above root help and --version on a TTY, amended into the install-site commit."
status: done
priority: P2
effort: 1h
branch: main
tags: [cli, ui, banner]
blockedBy: []
blocks: [261020-0017-core-module-layout]
created: 2026-10-20
---

# CLI banner

## Overview

`jss-devtools --help` and `jss-devtools --version` open with a banner instead of bare commander text. The art is `JSS` in figlet's
ANSI Shadow font, with the name, version, tagline, Node version and platform beside it, colored line
by line from cyan to magenta. It appears only when stdout is a terminal, so a captured or piped `--version`
stays a bare version. The doctor command in [the core layout plan](../261020-0017-core-module-layout/plan.md)
reuses it later.

## Inputs fixed by the user (2026-10-20)

| Question | Answer |
|---|---|
| Want a banner | "Tôi cũng muốn có banner nữa nha, không phải text terminal thuần, nhìn chán lắm." |
| Style | "JSS khối lớn + info bên cạnh"; "Cơ bản là banner + text, có thể tham khảo repo cũ `jss-devtools`" |
| Scope and delivery | "Chỗ banner, plan rồi riêng chỗ doctor đi." Cooked by another agent and amended into `8684998` |
| Where it shows | "Để apply phần banner cho help, version luôn á." |

```
     ██╗███████╗███████╗
     ██║██╔════╝██╔════╝   jss-devtools v0.0.1
     ██║███████╗███████╗   JavaScript stack dev tools
██   ██║╚════██║╚════██║
╚█████╔╝███████║███████║   node v22.22.1 · macOS arm64
 ╚════╝ ╚══════╝╚══════╝
```

## Evidence (probed 2026-10-20)

- `figlet` 1.8.0 renders `JSS` in ANSI Shadow at 24 columns and six lines; the full
  `JSS DEVTOOLS` is 96 columns and breaks an 80-column terminal.
- `node:util` `styleText` on Node 22.22.1 strips colors when stdout is piped and keeps them under
  `FORCE_COLOR=1`, so no color library is needed.
- The old JSS banner (`src/utils/banner.ts` in the old repo) called `figlet` at runtime, which
  cannot work here because the bundle ships without `node_modules`. It also printed on `--version`
  unconditionally. Here `--version` shows it only on a TTY: `install.sh` captures
  `node cli.mjs --version` through `$(…)`, a pipe, and rejects anything but a bare `x.y.z`.
- Today `jss-devtools` with no argument prints nothing and exits 0; root `--help` prints commander's
  plain help.

## Phases

| # | Phase | Effort | Depends on | Status |
|---|---|---|---|---|
| 1 | [Banner, help hook and docs](./phase-01-banner.md) | 1h | - | done |

## Acceptance criteria

- On a TTY, `jss-devtools --help` prints the banner, then commander's help, and
  `jss-devtools --version` prints the banner, then the version on its own last line.
- Piped, captured or in CI, `--help` and `--version` carry no banner and no ANSI codes;
  `--version` is exactly `x.y.z`, and `install.sh` and the image smoke test still pass.
- Help shown after a usage error (`jss-devtools nope`) carries no banner.
- No new dependency; the art is a committed constant.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green on Node 22.22.1.

## Non-goals

The doctor command and the core layout rules (the core layout plan), clack rendering, changing what
a bare `jss-devtools` does (the core layout plan settles it once a subcommand exists), a banner
wider than 80 columns.

## Delivery

Amend into `8684998` and force-push with `--force-with-lease=main:8684998`. A push to `main`
deploys, so the install site then serves a CLI with the banner. The amend also carries the
uncommitted core layout plan files that sit in the tree.

**Done (2026-10-20).** The amend turned `8684998` into `f2ce651`, "feat: ship the install site, the
terminal UI layer and the banner", and the push went out with the lease that named `8684998` as
the expected remote head. CI run `39471422527` was green on all three jobs: the checks in 29s, the
image in 34s, the Dokploy deploy in 5s.

The live site was verified after the deploy: `/install.sh` answers 200, the served
`checksums.txt` names `8308516a812a719a3456609f1ce70a6f31ee3b8a20a25be320b2fd3de1fb3288`, which
is the sha256 of the local `dist/cli.mjs` and of the bytes the site serves. An install into a
throwaway `HOME` put the CLI in `.jss-devtools/0.0.1` and its `--version` printed exactly
`0.0.1`, and on a pty the banner came first with the version on the last line.

One thing to know for the next deploy: the site answered 404 for about half a minute while
Dokploy was replacing the container, so a check that runs right after the deploy job goes green
may need a retry.
