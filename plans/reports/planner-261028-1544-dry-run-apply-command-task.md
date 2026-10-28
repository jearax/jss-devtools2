# Task: the dry run shows the command that applies it

For the cooker, 2026-10-28. Decided by the user (decision log, "Dry-run outro").

## Target output

```text
└  Dry run: nothing written
   To apply:
     $ jss-devtools init my-app --pm pnpm
```

- The command is `jss-devtools` (the program name the CLI already has, from `PACKAGE.name`; do not
  write a second copy), then the words the user typed after the program name, in their order, with
  every `--dry-run` token removed. Short flags and their combinations stay as typed (`-fy` stays
  `-fy`).
- Each word goes through the existing `shellQuote` (`'My App'`).
- `To apply:` and the `$` lines render exactly like `To finish:` in the error path: one helper for
  both, the same indent, `$` dim and the command cyan, no escape codes when piped or with `NO_COLOR`.
  On stdout, as today's outro.
- Read the typed words from what commander already parsed if it keeps them; only `src/cli.ts` may
  touch process-level state (architecture rule), so pass them down rather than reading
  `process.argv` in the command.

## Tests

- `init my-app --pm pnpm --dry-run`, `init --dry-run`, `init 'My App' --dry-run -f -y`,
  `init --dry-run .`: the exact outro.
- Piped output has no `\x1b`.
- Update every test and doc that asserts the old one-line dry-run outro.

## Comments

Default zero comments; one line only for a trap a reader would otherwise break. No JSDoc that says
what something is or does. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. If a hook blocks running the
built bundle, skip that and say so. No commit; reply with the Status block, a short summary and the
files changed.
