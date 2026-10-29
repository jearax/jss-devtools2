# Task: colours in `--help`

For the cooker, 2026-10-30. Decided by the user (decision log
[`plans/261022-0141-init-flow-discussion/decision-log.md`](../261022-0141-init-flow-discussion/decision-log.md),
section "Colours in `--help`"). The help is plain today; the section titles and the terms get colour
so each part stands apart. The text itself does not change.

## Target (colours in brackets)

```text
Usage: jss-devtools init [options] [dir]      ← "Usage:" [bold yellow], "jss-devtools init" [cyan], "[options] [dir]" [dim]

Create a project, or set up the current one   ← uncoloured

Arguments:                                    ← [bold yellow]
  dir                 Folder for a new …      ← "dir" [cyan]

Options:                                      ← [bold yellow]
  --pm <name>         Package manager for a new project (values: "bun" | …; default: "npm")
                      ↑ "--pm" [cyan], "<name>" [dim]; the "(values: …; default: …)" suffix [dim]
  --force, -f         Replace existing …      ← "--force, -f" [cyan]

Examples:                                     ← [bold yellow]
  $ jss-devtools init my-app              Create my-app, asking for the package manager
  ↑ "$" [dim], the command [cyan], the description uncoloured
```

Root help: `Commands:` bold yellow, `doctor`, `init [options] [dir]`, `help [command]` with the
name cyan and the placeholders dim. The banner stays as it is.

## Rules

- Use commander 15's style hooks in the one `configureHelp` call in `src/cli.ts` (`styleTitle`,
  `styleCommandText`, `styleOptionTerm`, `styleSubcommandTerm`, `styleArgumentTerm`,
  `styleOptionDescription`, …), set before the subcommands attach, as the existing comment says. Do
  not post-process the formatted help with regexes.
- A placeholder is a word that starts with `<` or `[`. The dim suffix is the part `optionDescription`
  appends; colour it where it is built or in `styleOptionDescription`, without a second copy of the
  `values`/`default` format.
- `Examples:` is our own `addHelpText` text in `init.command.ts`. Colour it with the same helpers as
  the titles and the `$` lines of `nextStepLines` in `src/core/ui/terminal.ui.ts`, so `$` looks the
  same everywhere. The columns must still line up when coloured.
- Colour must be on only when commander's output has colours: commander strips ANSI codes from help
  when the stream has no colours (`getOutHasColors` / `getErrHasColors`, which honour `NO_COLOR` and
  `FORCE_COLOR`). Check that `addHelpText` output and the help shown after an error (stderr) go
  through the same stripping; if not, make them.
- Piped, `CI=1` or `NO_COLOR=1`: help is byte for byte what it is today. The existing byte-for-byte
  help tests must pass unchanged.
- Help line wrapping must not change when coloured (commander measures width without the codes;
  confirm it with a narrow width test).

## Tests

- With colour forced (`FORCE_COLOR=1`, or commander's `getOutHasColors` stubbed to true): each title
  is bold yellow, a flag cyan, a placeholder dim, the suffix dim, an example `$` dim and its command
  cyan; root help colours `Commands:` and the command names.
- Without colour: no `\x1b` anywhere in `--help`, `init --help`, `doctor --help` and the help after
  an unknown command; text unchanged.

## Docs

`docs/system-architecture.md` where it describes help or the terminal colours, and any doc that says
help is plain.

## Comments

Default zero comments; one line only for a trap a reader would otherwise break. No JSDoc that says
what something is or does. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. If a hook blocks running the
built bundle, skip that and say so; the planner checks it in a pty on the Mac. No commit; reply with
the Status block, a short summary and the files changed.
