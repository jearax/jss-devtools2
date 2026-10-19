---
phase: 1
title: "Banner, help hook and docs"
status: done
priority: P2
effort: "1h"
dependencies: []
---

# Phase 1: Banner, help hook and docs

## Goal
Root help and `--version` open with the banner on a TTY, and on nothing piped or captured.

## Files
- Create `src/core/constants/banner.constant.ts`, `src/core/ui/banner.ui.ts`, `tests/banner.test.ts`.
- Modify `src/cli.ts`, `tests/bundle.test.ts`.
- The names already follow the role-suffix layout the core layout plan enforces later, so nothing
  moves when its rules land.

## Steps
- [x] `banner.constant.ts`: the six lines of `JSS` in ANSI Shadow as a string array, generated once
      with figlet 1.8.0 outside the repo (trailing spaces trimmed). A comment names the font and
      version so it can be regenerated. No figlet dependency.
- [x] `banner.ui.ts`:
      - `renderBanner({ name, version, description, node, platform, arch })` returns a string: the art with
        an info column beside lines 2, 3 and 5 (`<name> v<version>`, the description dimmed,
        `node <version> · <platform> <arch>` dimmed), each art line colored with `styleText`, stepping
        cyan, cyan, blue, blue, magenta, magenta. Platform names map `darwin` to `macOS`, `win32` to
        `Windows`, `linux` to `Linux`, anything else raw.
      - `shouldShowBanner({ isTTY, env })`: true only when stdout is a TTY and no CI marker is set.
        The rule is `isInteractive({ isTTY, env })` from `src/core/ui/terminal.ui.ts`, which already
        exists (shipped 2026-10-20 with the TUI research), so the banner and the terminal layer
        agree on what "a human is watching" means. **Shipped without a `shouldShowBanner` of its
        own (2026-10-20): the rule has one home, `isInteractive`, and a second name for it would be
        the duplicate the review of the terminal layer flagged.**
- [x] `src/cli.ts`: `program.addHelpText('beforeAll', (context) => …)` returns the banner plus a
      blank line when `!context.error` and `shouldShowBanner` allows it, otherwise `''`. Name,
      version and description come from the existing `pkg` object, so nothing is repeated.
- [x] `--version`: commander prints the version from its own `option:version` listener and exits.
      Register an `option:version` listener before `.version()` that writes the banner when
      `shouldShowBanner` allows it, so the banner precedes the version and the version stays the
      last line. Prove the listener order with a test; if commander does not keep it, replace
      `.version()` with an explicit `-V, --version` option that writes banner then version and
      throws `CommanderError(0, 'commander.version', …)` like commander does. **Commander keeps the
      order: the listener is registered before `.version()`, so the banner is written first.**
- [x] `tests/banner.test.ts`: the info column starts at the same column on every line it occupies;
      the output contains the version; `shouldShowBanner` is false without a TTY and false under
      `CI`; with `FORCE_COLOR=0` the output has no escape codes and every art line is at most 24
      columns plus the info column. **The TTY and CI cases are asserted on `showBanner` instead of
      on `shouldShowBanner`, and the rule itself is asserted in `tests/terminal-ui.test.ts`.**
- [x] `tests/bundle.test.ts`: piped `--help` contains `Usage:` and no `██`; piped `--version` is
      exactly the version from `package.json` and a newline. `tests/install.test.ts` already
      installs through a captured `--version`.
- [x] Docs: decision 0004 gets a "Later" note (banner above help, TTY only, quoting the user);
      `docs/system-architecture.md` facts table gains "Banner art: `src/core/constants/banner.constant.ts`";
      `docs/codebase-summary.md` lists the two new files.

## Verification
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` on Node 22.22.1.
- Manual on a real terminal: `node dist/cli.mjs --help` shows the colored banner;
  `node dist/cli.mjs --help | cat` shows none; `node dist/cli.mjs --version` shows the banner and
  `0.0.1`; `node dist/cli.mjs --version | cat` prints `0.0.1` only;
  `node dist/cli.mjs nope` shows help without the banner. **Done on 2026-10-20 with a pty
  (`script -q /dev/null`), which is the same thing a terminal does: the banner is coloured above
  the help and above the version, and the piped runs carry none.**
- After the push: CI green, `curl -fsSL https://jss-devtools.jjuidev.com/install.sh | sh` with a
  throwaway `HOME` still installs `0.0.1`. **Done on 2026-10-20: CI run `39471422527` was green on
  all three jobs, the served `checksums.txt` matched the sha256 of the local `dist/cli.mjs`, and an
  install into a throwaway `HOME` printed exactly `0.0.1`.**

## Risks
- A terminal without Unicode block glyphs shows boxes. Accepted: the info column still reads.
- `styleText`'s stream check uses `process.stdout`; if commander writes help to stderr (error
  help), the banner is already suppressed by `context.error`.
