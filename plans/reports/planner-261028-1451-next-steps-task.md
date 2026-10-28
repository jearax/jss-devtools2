# Task: list the commands to run next in `$` style

For the cooker, 2026-10-28. Decided by the user (decision log, "Commands to run next", with its scope
and existing-mode notes). Commands the user should run next are listed one per line, each prefixed
with a dim `$ `, the command in cyan, like the help Examples. It replaces the one-line
`next: cd my-app, pnpm run dev` outro and the inline `To finish: cd my-app && npm install`.

## Target output

Create mode (`init my-app --pm pnpm -y`):

```text
◇  Sorted package.json
│
└  Next steps
     $ cd my-app
     $ pnpm run dev
```

Create mode in the current folder (`init .`): no `cd` line.

```text
└  Next steps
     $ pnpm run dev
```

Existing mode (`init -y`), replacing `done`:

```text
└  Next steps
     $ pnpm run format
```

Install failed (stderr, exit 1, as today):

```text
│
└  install failed; the files are written
   To finish:
     $ cd my-app
     $ npm install
```

`package.json` sort failed (stderr, exit 1): the tool output stays between the first line and
`To finish:`, as today:

```text
│
└  prettier-package-json failed; the files are written
   <the tool's output>
   To finish:
     $ cd my-app
     $ pnpm exec prettier-package-json --write package.json
```

In existing mode, and for `init .`, the failure lists drop the `cd` line too. The `cd` target keeps
today's quoting (`$ cd 'My App'`). The `<pm>` in each command is the one init used.

## Rules

- One renderer for a command list, used by the outro and by the error path, so both look the same.
  The error path is `renderError` in `src/core/ui/terminal.ui.ts`; carry the commands on `CliError`
  (an optional field next to `hint`), not baked into the message string.
- Colours through `styleText` with the right stream (stdout for the outro, stderr for errors): `$`
  dim, the command cyan; the first error line stays red as today, `To finish:` uncoloured. Piped,
  `CI=1` or `NO_COLOR`: the same text, no escape codes.
- Scope stops there: preflight errors and doctor hints with a single command stay on one line
  (decision log). Every other message stays as it is.

## Tests

- Outro for create, create in `.`, existing; install failure and sort failure in create and existing
  mode; a folder name that needs quoting.
- Piped output has no `\x1b`.
- Update every test and doc that asserts the old `next:`, `done` or `To finish: …` text (grep `src`,
  `tests`, `docs`, `README.md`).

## Comments

Default zero comments; one line only for a trap a reader would otherwise break. No JSDoc that says
what something is or does. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. If a hook blocks running the
built bundle, skip that and say so; the planner runs it on the Mac. No commit; reply with the Status
block, a short summary and the files changed.
