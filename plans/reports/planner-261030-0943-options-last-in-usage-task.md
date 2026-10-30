# Task: `[options]` last in every usage

For the cooker, 2026-10-30. Decided by the user (decision log
[`plans/261022-0141-init-flow-discussion/decision-log.md`](../261022-0141-init-flow-discussion/decision-log.md),
section "`[options]` last in every usage").

## Target

```text
Usage: jss-devtools [command] [options]

Commands:
  doctor [options]        Check Node.js, git and the package managers
  init [dir] [options]    Create a project, or set up the current one
  help [command]          Display help for command

Usage: jss-devtools init [dir] [options]
Usage: jss-devtools doctor [options]
```

The column widths follow from the new terms; let commander compute them.

## Rules

- One rule in the `configureHelp` call in `src/cli.ts` (for example a `commandUsage` and a
  `subcommandTerm` override, or a shared helper both use) that moves `[options]` to the end. No
  per-command `.usage()` strings.
- Parsing does not change: options are still accepted before or after the arguments. Do not touch
  `passThroughOptions` or `enablePositionalOptions`.
- The colours from the previous task stay: each word still goes through `styleUsage` /
  `styleSubcommandTerm`, so `[dir]` and `[options]` stay dim and names cyan.
- The help after an error (commander's `showHelpAfterError`) shows the same usage.

## Tests and docs

- Update the byte-for-byte help tests for the new usage lines only; nothing else in the help text may
  change. Add a case proving `init --dry-run my-app` and `init my-app --dry-run` still parse the same.
- Grep `src`, `tests`, `docs`, `README.md` for `[options] [dir]`, `[options] [command]` and update
  every copy.

## Comments

Default zero comments; one line only for a trap a reader would otherwise break. No JSDoc that says
what something is or does. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. No report file, no commit;
reply with the Status block, a short summary and the files changed.
