---
title: Cooked the CLI banner
date: 2026-10-20
summary: "Shipped the JSS block-letter banner above the root help and --version on a terminal only, with the art as a constant, the info column aligned, and the piped runs untouched"
---

# Cooked the CLI banner

## What happened
The [CLI banner plan](../261020-0023-cli-banner/plan.md) was cooked: the JSS block letters in
figlet's ANSI Shadow font now open `--help` and `--version`, with the name, the version, the
description, the Node version and the platform in a column beside them. The delivery step — the
amend into `8684998` and the force-push — was not authorized and was not done; nothing is
committed.

## Findings
- **The art is figlet's, byte for byte.** Generated once with figlet 1.8.0 in a temp directory
  outside the repository: six lines of 24 columns, and the last line of the output is empty, so the
  constant keeps six lines. The whole banner is 56 columns wide, inside the 80 the plan allows.
- **Commander keeps the order.** `version()` registers its own `option:version` listener, and a
  listener registered before it runs first, so the banner is written before the version. The plan's
  fallback (an explicit `-V, --version` option) was not needed.
- **`FORCE_COLOR=0` really does turn the colour off** in Node 22.22.1, so the plan's test works as
  written. `FORCE_COLOR=1` turns it on, which is why the piped tests set `NO_COLOR` instead.
- **`styleText` decides from `process.stdout`**, so the colour of the banner follows stdout even
  though the version path writes it before commander writes the version.

## Decision
`showBanner(info, context)` writes the banner and a blank line, and asks `isInteractive()` whether
the output is a terminal. The banner has no rule of its own: `shouldShowBanner` from the plan was
dropped, because the terminal layer already owns that rule and a second name for it is the
duplicate the review of the terminal layer flagged.

## Also
- The help hook returns the banner and a blank line when the help is not an error, so `jss-devtools
  nope` still shows plain help.
- Verified on a pty (`script -q /dev/null`), which is what a terminal does: the banner is coloured
  above the help and above the version, the piped runs carry none, and the piped `--version` is
  exactly `0.0.1\n`, which is what `install.sh` reads.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
