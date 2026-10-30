# Task: align the docs with the code at 3416f6f

For the cooker, 2026-10-30. Docs only: no change under `src/`, `tests/`, `scripts/`, `docker/`, `ci/`.

The last three commits changed behaviour without touching the docs: `ce608ec` (help colours,
partly documented), `b66244b` (`[options]` last in every usage) and `3416f6f` (banner gradient).

## Rules for every edit

- Code owns what and how; docs own why and where. Point to the owning file instead of re-describing
  it. No copied code, no hex values, no counts.
- Edit only the lines below. Do not reorder, re-voice or refresh anything else.
- English, the voice of the surrounding text.

## Edits

1. `docs/system-architecture.md`, the help paragraph (starts "The help is coloured through
   commander's help style hooks"): add one or two sentences. Every usage line puts `[options]`
   last (`jss-devtools [command] [options]`, `init [dir] [options]`) through one rule in the
   `configureHelp` call in `src/cli.ts`, so a new command follows it without its own `.usage()`;
   parsing is unchanged, options are accepted before or after the folder.
2. `docs/system-architecture.md`, `## Banner`: the info line now names `Node.js`. Add a short
   paragraph on colour: the art takes a left to right gradient over the design system's primary
   colours, declared in `src/core/constants/banner.constant.ts`, with the shadow characters dimmed;
   the depth comes from the stream's `getColorDepth`, so a truecolor terminal gets the gradient, a
   256-colour one the nearest colours, a 16-colour one a single magenta, and `NO_COLOR` or a
   non-terminal no codes. Why the depth comes from Node: one rule shared with `styleText`, not a
   second copy of the environment checks.
3. `docs/system-architecture.md`, "Where each fact is declared": the `Banner art` row becomes
   `Banner art and colours`, same files.
4. `docs/codebase-summary.md`:
   - `src/core/ui/banner.ui.ts` row: add that it colours the art with the gradient at the stream's
     colour depth.
   - `src/core/constants/` row: `banner.constant.ts` holds the JSS art, the design system colours
     and the platform names.
   - `tests/banner.test.ts` row: add the colour depths (truecolor, 256, 16, none) and no escape
     byte when piped.
   - add a `tests/help-colours.test.ts` row after `tests/cli.test.ts`: say what it proves, from
     reading the file.
   - remove the stray empty cell `|     |` at the end of the `tests/init-install-steps.test.ts` row.

Then grep `README.md`, `CLAUDE.md` and `docs/` (not `docs/decisions/`) for `[options] [`,
`node v`, `one colour per row` and any other claim the three commits made false, and report what
you find before changing anything not listed above.

## Comments

No code changes, so no comments.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output (Prettier formats the
Markdown tables). No report file, no commit; reply with the Status block, a short summary and the
files changed.
