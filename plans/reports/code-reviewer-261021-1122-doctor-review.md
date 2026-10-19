# Review: core and command layout, doctor (uncommitted, on top of 351ac19)

Cooked by the opencode agent in Herdr pane `wG:p2` with `ak:cook`, from
`plans/261020-0017-core-module-layout/`. Reviewed from pane `wG:p1`.

## Outcome

Architecture matches the plan, including the mid-cook rename to `src/commands/`. Gate green on
Node 22.22.1: lint, typecheck, test (10 files, 86 tests), build (119.18 kB). One bug, one
user-decided behavior change, two output nits, and a strict comment pass go back to the cooker.

## Findings

1. **Bug: a git that fails reports as installed.** `gitVersion` returns `''` when
   `git --version` exits non-zero, because only `ENOENT` maps to `null`. With a stub `git` that
   exits 3 on `PATH`, doctor prints `◆ git.installed` with an empty detail. Any non-zero exit must
   fail the check.
2. **`git.repository` spawns `git --version` again and repeats the install hint.** Run it once,
   pass the result through the context; the skipped check carries no hint, so a missing git reports
   once, as the plan says.
3. **Bare `jss-devtools`** now exits 1 with help on stderr and no banner. User decision
   (2026-10-21): "Help + banner, exit 0", the same as `--help`; `jss-devtools nope` stays exit 1.
4. **Output nits:** "the checks are done" breaks the sentence case of the other lines; the final
   `CliError` hint "fix the failed checks above, then run the command again" adds nothing to the
   per-check hints above it.
5. **Comments, strict bar** (user, 2026-10-21: "vẫn còn rất yếu… cần áp dụng mạnh hơn"). Default
   is no comment; JSDoc that says what a thing is goes; a comment survives only when removing it
   would likely cause a wrong change. Delete: `cli.ts` the `exitOverride` doc, "Never exit 0…",
   "An expected failure…"; `cli.error.ts` "A failure the CLI expects."; `exit-code.constant.ts`
   (decision 0023 is its home); `doctor-check.type.ts` "The git calls…"; `animated-spinner.ui.ts`
   "The animation must not keep the CLI alive…"; `terminal.ui.ts` the `TerminalTask.run` doc;
   `tests/install.test.ts:51`; `tests/terminal-ui.test.ts:226`; `architecture-rules.ts` the two
   field docs. Shorten: `cli.ts` the `CommanderError` comment, `isInteractive`'s doc to the stdin
   trap, `banner.constant.ts` to two lines, the scanner's logical-path doc to its second sentence.
   Fix: `cli.ts:16` still says "modules". `docs/code-standards.md` § Comments states the strict
   bar.

## Not defects

- `scripts/package-info.mjs` with a `.d.mts`: tsdown loads its config through Node's own loader,
  which cannot import a `.ts` module, and `allowJs` is off.
- Fix hints on stdout and the failure summary on stderr: as planned.

## Resolution (re-review, 2026-10-21)

All five fixed and re-run by the reviewer on Node 22.22.1: gate green (90 tests, 119.33 kB). A stub
`git` exiting 3 now fails `git.installed` ("git --version failed with exit code 3") and skips
`git.repository` with no repeated hint. Bare `jss-devtools`: banner and help on a pty, help only
when piped, exit 0, empty stderr; `nope` exits 1. Every surviving comment is a trap or an external
contract; `docs/code-standards.md` § Comments states the strict bar.

## Unresolved questions

- None for this round. Delivery (amend into `351ac19` and push) waits for the user after the
  re-review.
