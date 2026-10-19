---
phase: 1
title: "install.sh and its tests"
status: done
priority: P1
effort: "1.5h"
dependencies: []
---

# Phase 1: install.sh and its tests

## Goal
A POSIX `scripts/install.sh` that downloads the bundle, verifies it, and installs a `jss-devtools`
command, with tests that run it for real.

## Context
- Prior art: H0 `deploy/install-site/install.sh` (165 lines): need_cmd, download with curl or wget,
  sha256 with `sha256sum` or `shasum`, Node check, wrapper script, PATH hint.
- The wrapper `exec node "<home>/cli.mjs" "$@"` means `argv[1]` is the real file, so it does not
  depend on the symlink fix, and it needs no executable bit on the download.
- `package.json` `version` becomes `0.0.1` (F8). It stays the single source; the build injects it.

## Requirements
- Everything runs inside `main "$@"`, the last line of the file, so a truncated `curl | sh` runs nothing.
- `JSS_DEVTOOLS_BASE_URL` (default `https://jss-devtools.jjuidev.com/releases/latest`),
  `JSS_DEVTOOLS_HOME` (default `$HOME/.jss-devtools`), `JSS_DEVTOOLS_BIN_DIR` (default `$HOME/.local/bin`).
- Refuses Node below `MIN_NODE_VERSION` before downloading. A test asserts that value equals
  `engines.node` in `package.json`, since a served script cannot read the manifest.
- Downloads `cli.mjs` and `checksums.txt` into a temp dir, verifies sha256, runs `node cli.mjs
  --version`, and only then moves the file into place and writes the wrapper atomically. Temp files
  are removed on every exit path.
- Prints the installed version and a PATH hint when the bin dir is not on `PATH`.

## Files
- Create `scripts/install.sh`, `tests/install.test.ts`.
- Modify `package.json` (`version` `0.0.1`).

## Steps
- [x] Write `scripts/install.sh`.
- [x] Test suite: a Node `http` server on 127.0.0.1 serves the built `dist/cli.mjs` and a computed
      `checksums.txt`; `sh scripts/install.sh` runs with a temp `HOME`, base URL and bin dir.
      Cases: success then `jss-devtools --version` prints `package.json` version; checksum mismatch
      exits non-zero and installs nothing; the Node floor equals `engines.node`. A fourth case runs
      the installer with a fake `node` reporting v18 and proves the refusal happens before the
      download.
- [x] shellcheck locally through `koalaman/shellcheck-alpine:v0.11.0` with `--shell=sh`; also
      enforced in CI by a `checks` job step.

## Verification
- `pnpm test` green; `docker run --rm -v "$PWD:/mnt" koalaman/shellcheck-alpine:v0.11.0 shellcheck --shell=sh /mnt/scripts/install.sh` clean.

## Risks
- The test needs `curl` or `wget` on the machine; both GitHub's Ubuntu runners and macOS have curl.
