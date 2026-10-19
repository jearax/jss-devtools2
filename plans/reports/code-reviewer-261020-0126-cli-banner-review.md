# Review: CLI banner (uncommitted, on top of 8684998)

Cooked by the opencode agent in Herdr pane `wG:p2` with `ak:cook`, from
`plans/261020-0023-cli-banner/`, delivery step excluded. Reviewed and re-run from pane `wG:p1`.

## Outcome

Accepted. Every acceptance criterion holds, one finding and one nit were fixed in a second round,
and nothing is committed or pushed.

## Verified by the reviewer (Node 22.22.1)

- Gate: lint, typecheck, test (6 files, 51 tests), build (`dist/cli.mjs` 112.92 kB, 28.16 kB gzip),
  format:check, all green.
- On a pty (`script -q /dev/null`): `--help`, `--version` and `-V` print the colored banner (cyan,
  blue, magenta) with the info column; the version is the last line.
- `CI=true` on a pty: `--version` prints `0.0.1` only.
- Piped: `--version` is exactly `0.0.1\n`; `--help` has no ESC byte and no banner; a `$(…)` capture
  as `install.sh` does gives `0.0.1`.
- `jss-devtools nope`: error and help, no banner (help goes out with `context.error`).

## Deviations from the plan, accepted

- No `shouldShowBanner`: `isInteractive()` already owns "a human is watching"; a second name would
  duplicate it.
- `showBanner(info, context)` shipped now, not in the core layout phase, because the `--version`
  hook needs it. The core layout phase 1 step is ticked accordingly.

## Findings, fixed in round two

1. `tests/bundle.test.ts` asserted `'0.0.1\n'` literally, so the next version bump breaks it and the
   version gets a second home. The plan asked for it; now read from `package.json`.
2. Nit: `renderBanner` read `process.arch` implicitly while every other field came through
   `BannerInfo`; `arch` is now a field, and the test asserts `node v22.22.1 · macOS arm64`.

## Unresolved questions

- Delivery: amend everything into `8684998` and force-push with `--force-with-lease=main:8684998`?
  The push deploys the install site, which then serves a CLI with the banner.
