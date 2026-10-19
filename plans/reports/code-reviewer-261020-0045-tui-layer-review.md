# Code review: the `core/ui` terminal layer

Reviewed 2026-10-20, on Node 22.22.1, against the uncommitted change in the working tree.

## Scope

- Files reviewed: `src/core/ui/terminal.ui.ts` (new, 126 lines),
  `src/core/errors/cli.error.ts` (new, 22), `src/core/constants/exit-code.constant.ts` (new, 7),
  `src/cli.ts` (modified, 118), `tests/terminal-ui.test.ts` (new, 187), `tests/cli.test.ts`
  (modified, 116), `tests/support/capture-stream.ts` (new, 19), `docs/decisions/0004-cli-parser-and-prompts.md`,
  `docs/system-architecture.md`, `docs/codebase-summary.md`, `docs/project-roadmap.md`, `CLAUDE.md`,
  `plans/261020-0017-core-module-layout/plan.md`, `plans/261020-0017-core-module-layout/phase-01-core-and-architecture-rules.md`,
  `plans/reports/researcher-261020-0023-tui-framework.md`.
- Lines of code analysed: about 600 of source and test, plus the docs diff.
- Review focus: the new terminal layer, the entry-point change, the tests, and the docs the change moved.
- Checks run: `pnpm lint` (clean), `pnpm typecheck` (clean), `pnpm test` (32 passed, 5 files),
  plus targeted probes against the real compiled repository code and against `@clack/prompts` 1.8.1
  in `node_modules` to establish what the library actually does.
- Updated plans: `plans/261020-0017-core-module-layout/phase-01-core-and-architecture-rules.md`
  (checkboxes for the three items this change completed).

## Overall assessment

The shape is right. A thin `core/ui` layer that owns the two cases clack does not cover, a
`CliError` that carries its own exit code and a fix hint, and an injected `TerminalContext` so the
decision can be tested without a pty — that is a good design, and the comment discipline in the
new files is the best in the repository: every comment says why, none of them narrates.

One finding blocks it. The clack spinner installs global process handlers for the whole time the
work runs, and one of them is `unhandledRejection`, which swallows a rejection and lets the process
exit 0. That is the exact failure class this repository exists to prevent, it is invisible to the
architecture rule that is supposed to enforce it, and it only happens in the interactive branch —
the piped branch of the same function keeps the invariant. The layer was built to own clack's
edge cases; this one is not owned.

The rest is a set of smaller things: a failure message that lands on stdout as well as stderr, a
handful of branches in the new code that no test pins, four places where the docs now say
something the code does not do, and one test assertion that depends on the ambient environment
rather than on the code.

## Critical issues

### 1. Blocker — the clack spinner turns an unhandled rejection into exit 0

`src/core/ui/terminal.ui.ts:68` builds a clack spinner, and `src/core/ui/terminal.ui.ts:71-73`
starts it. In `@clack/prompts` 1.8.1, `spinner.start()` calls a helper that registers five global
process listeners (`node_modules/@clack/prompts/dist/index.mjs:974`):

```js
A = () => {
  process.on("uncaughtExceptionMonitor", f), process.on("unhandledRejection", f),
  process.on("SIGINT", i), process.on("SIGTERM", i), process.on("exit", g), ...
}
```

They are removed only by `stop`/`error`/`cancel`/`clear` (`H()`), so they live for the whole
duration of the task. Node's default handling of an unhandled rejection is to crash; a registered
`unhandledRejection` listener suppresses that default. Node's default handling of SIGINT is to
terminate; a registered `SIGINT` listener replaces that default too.

Measured, through the repository's own compiled `runTasks`:

| Branch | Detached rejection inside the task | Result |
| --- | --- | --- |
| Interactive (`isTTY: true`) | `Promise.reject(new Error(...))` not awaited by anything | swallowed, script reached the end, **exit 0** |
| Piped (`isTTY: false`, plain-line fallback) | same | crashed with the stack trace, **exit 1** |

The control is the same script with the same task; the only difference is which branch of
`createSpinner` ran. The interactive branch breaks the invariant and the piped branch keeps it.

Why this is a blocker and not a note: `CLAUDE.md:45-47` and `docs/system-architecture.md:72-74`
both say that nothing in this repository may turn a failure into a success, and say the previous
release shipped a handler that did exactly that. The architecture rule that guards it
(`tests/support/architecture-rules.ts:23-29`) matches `process.on('uncaughtException'|'unhandledRejection')`
in source text, so it cannot see a handler the library registers at runtime. `runTasks` is the API
every command will use, and in the interactive path it always builds a clack spinner, so the first
command that adopts it inherits the behaviour by construction.

The same root cause produces a second symptom: **Ctrl+C does not stop the CLI while a spinner
runs.** Measured: a clack spinner running, then SIGINT — the spinner prints `■  Canceled` and the
process keeps going and exits 0. The user is told the work was cancelled and it was not; only
SIGKILL stops it. `runTasks` does not read `spinner.isCancelled`, so the cancel is not even
noticed.

Fix. Own the animation instead of borrowing it. The layer already owns "no cursor codes when the
output is piped" because clack will not do it; the same argument applies to the process handlers,
which clack will not give up. A hand-rolled spinner is about forty lines and removes the whole
class of problem:

```ts
// A spinner that owns its own process state: clack's spinner registers global handlers while it
// runs, and its unhandledRejection handler turns a failure into exit 0.
const FRAMES = ['◒', '◐', '◓', '◑'];
const spinner = createTerminalSpinner(context);
// start(): write the first frame, then setInterval(() => redraw(), 80)
// stop(): clearInterval, write the final line, restore the cursor
```

and keep `process.on(...)` out of the layer entirely, so the architecture rule stays meaningful.

If clack's spinner is kept, the minimum is to take the handler back immediately after `start()`,
which is fragile but honest:

```ts
spinner.start(message);
// clack's spinner swallows unhandled rejections while it runs, which turns a failure into exit 0.
process.removeAllListeners('unhandledRejection');
process.on('unhandledRejection', (reason) => {
  throw reason;
});
```

That still leaves SIGINT swallowed, so it is a partial fix, and `removeAllListeners` would also
remove a handler the CLI installed itself.

## High priority findings

### 2. Major — the failure message is written to stdout as well as stderr

`src/core/ui/terminal.ui.ts:112` calls `spinner.error(messageOf(error))` in the catch. In the
piped branch that is `log.error`, which writes to stdout; in the interactive branch it is clack's
spinner error line, which also writes to stdout (`n = process.stdout`). The error is then rethrown
(`src/core/ui/terminal.ui.ts:114`) and rendered again on stderr by `renderError`.

Measured end to end, through the real `runTasks` → `runProgram` path:

```
stdout:  │
         ◇  Installing dependencies
         │
         ▲  the install failed        <-- the failure, on the data stream
stderr:  │
         ▲  the install failed
         │
         ●  run it again with --yes
exit code: 1
```

Two problems. A machine that parses stdout — the `--json` mode the core-layout plan already
anticipates — sees the error text inside its data stream, which breaks the parse. And a human sees
the message twice, in two different formats, on two different streams.

The docs assert the opposite of what happens: `docs/project-roadmap.md:63-64` says "a failure is
rendered on stderr with its fix hint", and `docs/system-architecture.md:47` puts `renderError` on
stderr for every column of the table. The failure *is* on stderr, but it is also on stdout, and
the docs do not say so.

Fix: the failure line belongs on stderr, or it should not carry the message. Either

```ts
} catch (error) {
  // The message is rendered once, on stderr, by renderError. The task line only says it failed.
  spinner.error(task.title);
  throw error;
}
```

or give the fallback an `error` that writes to stderr the way `renderError` does. The first is
smaller and keeps the task list readable.

### 3. Major — `runProgram` does not register the unknown-command fallback, so it is a weaker entry point than `main`

`src/cli.ts:24-34` registers the fallback, and `src/cli.ts:71` calls it from `main`. The new
exported `runProgram` (`src/cli.ts:77`) parses and routes errors, but never registers the
fallback, so it inherits commander's "too many arguments" for an unknown command instead of
"error: unknown command 'inti'".

Today `main` still covers the guarantee — `tests/cli.test.ts:50-58` proves the unknown command is
named and the exit code is 1 — so nothing is broken right now. But the flow the plan commits to is
`createProgram()` → module code attaches commands → `runProgram(program, argv)`, and in that flow
`main` is bypassed and the guarantee is lost. `src/cli.ts:22-23` already says the fallback is
"registered at parse time, because command modules attach after `createProgram` returns"; that
reasoning applies to `runProgram`, not to `main`.

Fix: move the registration into `runProgram`, so both entry points behave the same.

```ts
export const runProgram = async (program: Command, argv: readonly string[]): Promise<void> => {
  addUnknownCommandFallback(program);
  ...
};
```

and drop the call from `main`. The fallback check `program.commands.length > 0` is evaluated
before `parseAsync`, which is exactly when the modules have attached.

## Medium priority improvements

### 4. Minor — `isInteractive` models stdout only, but it is documented as the one rule

`src/core/ui/terminal.ui.ts:28-33` decides on stdout and `CI`. `docs/system-architecture.md:50-51`
calls it "the one rule: stdout is a terminal and no CI marker is set", and the research report
(line 71-72) says a prompt must only be called "when stdin and stdout are TTYs". The two are not
the same question: `jss-devtools init | tee log` has a TTY stdin and a piped stdout. The prompt
guard is deferred to the first prompt, so nothing is broken yet, but the doc calls this the one
rule, and the next implementer will reach for it to decide whether to prompt.

Fix: split the two concepts now, before the first prompt needs it. Keep `isInteractive` for output
(stdout), and add the stdin half where the prompt guard lands, or rename this one
`hasTerminalOutput` and add `canPrompt` next to it.

### 5. Minor — the `CI` allow-list has four explicit branches and no test

`src/core/ui/terminal.ui.ts:32` enumerates `undefined`, `''`, `'0'` and `'false'` as "not CI".
Only `'true'` is covered (`tests/terminal-ui.test.ts:30-37`). The other three are deliberate
choices, and one of them is a decision worth pinning: a CI that sets `CI=false` should still get
the plain-line output.

Fix: one test that loops the accepted values.

```ts
it.each(['', '0', 'false'])('is interactive when CI is %j', (ci) => {
  expect(isInteractive({ isTTY: true, env: { CI: ci } })).toBe(true);
});
```

### 6. Minor — "no escape byte" is asserted against the environment, not against the code

`tests/terminal-ui.test.ts:51` and `:97` assert `expect(output).not.toContain(ESC)`. The escape
bytes in the piped path come from `styleText`, which validates colour support against
`process.stdout` — not against the `TerminalContext` the test injects. So the assertion describes
the machine, not the layer.

Measured: `FORCE_COLOR=1 npx vitest run tests/terminal-ui.test.ts` fails two tests, because
`styleText` then colourises the fallback glyphs. Any CI that sets `FORCE_COLOR` breaks the suite,
and `docs/project-roadmap.md:63-64` ("a captured run carries no escape byte") is only true when
`FORCE_COLOR` is unset.

Fix: assert the codes the layer actually prevents, and let colour be colour:

```ts
const CURSOR_CODES = ['\u001b[?25l', '\u001b[?25h', '\u001b[1G', '\u001b[J'];
expect(CURSOR_CODES.some((code) => output.includes(code))).toBe(false);
```

If the guarantee is meant to be "no ANSI at all", the layer has to strip colour itself when the
output is not a terminal, and the doc should say so.

### 7. Minor — the paths the code takes but no test pins

- `update()`, the progress callback, is never exercised. `src/core/ui/terminal.ui.ts:104-106`
  passes it to the task, and the piped branch turns it into `log.message`. Probed manually: it
  works, and it emits a guide bar per update, so the piped output for one task with two updates is
  seven lines. Worth a test and a look at whether that is the shape a consumer wants.
- A task that returns `undefined` or `''` falls back to the title
  (`src/core/ui/terminal.ui.ts:108`); that branch is untested.
- A task that succeeds on a terminal is untested. Only the failure path runs the interactive
  branch (`tests/terminal-ui.test.ts:138-157`).
- `renderError` with a `CliError` that has no hint is only checked for "nothing on stdout"
  (`tests/terminal-ui.test.ts:170-178`); the stderr side of that case is not asserted.
- `runProgram` with a plain `Error` — the `reportFatalError` branch, which the docs describe as
  "anything else still goes through `reportFatalError`" — is not tested through `runProgram`.
  `reportFatalError` is only tested directly (`tests/cli.test.ts:79-116`).

### 8. Minor — the spinner test's comment is wrong, and its 200 ms wait buys nothing

`tests/terminal-ui.test.ts:59` says "The spinner draws its first frame after 80ms, and the cursor
codes follow from the second." Measured writes from `spinner.start()`:

```
1ms   "\u001b[?25l"      <- cursor hide
1ms   "│\n"              <- guide bar
84ms  "◒  work"          <- first frame
164ms "\u001b[1G" "\u001b[J"  <- cursor codes
```

The first escape byte is written synchronously by `start()`, at 1 ms, so the assertion does not
depend on the sleep. The comment describes a mechanism that is not the one producing the escape
byte, which will mislead the next person who tightens the timing.

Fix: drop the sleep, or keep it and correct the comment to name the cursor-hide.

### 9. Minor — `messageOf` is written twice

`src/core/ui/terminal.ui.ts:20-22` and `src/cli.ts:57` are the same function. Two homes for one
fact is what `CLAUDE.md:48-51` and `docs/code-standards.md` both warn against, and the two error
renderers have to stay in step because they print the same message in two different formats.

Fix: one helper, imported by both. `core/utils/message.util.ts` fits the suffix table in
`plans/261020-0017-core-module-layout/plan.md:65-75`.

### 10. Minor — the error path is not single-sourced

`renderError` writes a clack glyph block to stderr; `reportFatalError` writes a bare line to
stderr. A `CliError` and a crash look different on the same stream, and neither the code nor the
docs says which applies when. Combined with finding 2, the same message can appear on two streams
in two formats.

Fix: decide one format for stderr. Either both go through `renderError` (which means the
`reportFatalError` test that asserts a single bare line changes), or `renderError` adopts the bare
line. Then the layer has exactly one error writer.

## Low priority suggestions

### 11. Nit — `docs/system-architecture.md:17` says "Three exports" and the module now exports four

`createProgram`, `main`, `reportFatalError` and the new `runProgram`. The sentence at line 17 and
the three bullets under it were not updated; the paragraph at line 27 introduces the fourth.
`dist/cli.mjs` now exports four names, so the bundle's public surface grew too.

Fix: "Four exports, each with one job", and add `runProgram` to the list.

### 12. Nit — `docs/system-architecture.md:178` credits a reader that does not exist

The "Where each fact is declared" table says `isInteractive` is read by "the terminal layer, the
banner". There is no `src/core/ui/banner.ui.ts`; the banner plan is still `status: pending`
(`plans/261020-0023-cli-banner/plan.md:4`). `CLAUDE.md:52-53` says "Write what exists. No
placeholder markers, no speculative architecture."

Fix: drop "the banner" until the banner lands, or word it as the plan's intent.

### 13. Nit — `docs/project-roadmap.md:79` still lists the exit-code scheme as not started

The table under "Not started" has a "Cross-cutting" row whose scope is "Exit-code scheme, which
decisions carry over from the old prototype" with open questions X1, X2, X3. The exit-code scheme
ships in this change and X1 is marked answered in
`plans/261019-1050-jss-devtools-rewrite/open-questions.md`. The "Core module layout" row above it
also still shows X2 as open, and `src/core/` now exists.

Fix: remove the exit-code row, and update the core-layout row to say what is done and what is not.

### 14. Nit — decision 0004 says commands may not import clack; the plan says they may

`docs/decisions/0004-cli-parser-and-prompts.md:34` says "The library itself stays behind that
layer, so a command never renders on its own." The plan's rule table
(`plans/261020-0017-core-module-layout/plan.md:85`) allows `@clack/prompts` in `*.ui.ts`,
`*.command.ts` and `cli.ts`, and the research report (lines 98-99) says "Commands may still import
clack for the plain primitives".

Fix: reword the decision to "the animated and interactive primitives go through the layer;
commands may still use the plain ones directly."

### 15. Nit — colour on stderr is decided by stdout

`renderError` writes to `process.stderr`, but `styleText` inside clack validates colour support
against `process.stdout`. Measured: with stdout on a tty and stderr redirected to a file, the
stderr file contains `\u001b[31m…\u001b[39m`. A redirected stderr log therefore carries colour
codes.

Fix: acceptable in most CLIs, but it is a decision, not an accident. Either note it or strip
colour when `process.stderr` is not a tty.

### 16. Nit — `capture` restores a bound copy and drops two arguments

`tests/support/capture-stream.ts:4` binds `stream.write` and `:15` restores the bound copy, so
after the first capture `stream.write` is an own property rather than the prototype method. The
replacement at `:6` also drops the `encoding` and `callback` arguments, so a string written with
an explicit encoding would be decoded as utf8.

Fix: keep the original unbound reference and forward the rest of the arguments.

```ts
const original = stream.write;
stream.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
  chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());
  return true;
}) as typeof stream.write;
// ...
stream.write = original;
```

### 17. Nit — `terminal.ui.ts` holds two concerns

The file exports `isInteractive`, `createSpinner`, `runTasks` and `renderError`. The first three
are the terminal; the fourth is error rendering, which the plan assigns to this file
(`phase-01-core-and-architecture-rules.md:52`), so it is per spec — but `core/errors/` or a
`core/ui/error.ui.ts` would keep the file to one concern, and the file is already the layer every
command will import.

### 18. Nit — the phase plan's checkboxes do not match its own notes

In `plans/261020-0017-core-module-layout/phase-01-core-and-architecture-rules.md`, the
`exit-code.constant.ts`, `cli.error.ts` and `src/cli.ts` items are marked "**Done
(2026-10-20)**" in the text but are still `- [ ]`, while the item next to them is `- [x]`. I have
ticked the three that the change completed; the plan's own convention should hold for the next
writer too.

## Positive observations

- **The comment discipline is right.** Every comment in the new files explains a constraint the
  code does not show: why clack's spinner never runs when the output is piped
  (`src/core/ui/terminal.ui.ts:47-49`), why the spinner is stopped in the catch
  (`src/core/ui/terminal.ui.ts:110-111`), why the exit path resolves the symlink
  (`src/cli.ts:100-101`). None of them restates the next line. That is what
  `docs/code-standards.md:136-149` asks for, and it is rare to see it applied this consistently.
- **`TerminalContext` is the right seam.** Injecting `isTTY` and `env` instead of reading
  `process.stdout` directly is what makes the piped and the interactive path testable without a
  pty, and it is why the fallback could be tested at all.
- **The `CliError` shape is right.** An error type that carries its own exit code and an optional
  hint, with the exit code defaulting to failure, is the smallest thing that supports the plan's
  "0/1, kiểu lỗi có code" decision without a registry of codes.
- **The exit codes live in one file** with a value and a type derived from the same literal, so a
  new code cannot be added to one and forgotten in the other.
- **The research was measured, not assumed.** The report gives the byte counts, the bundle sizes
  and the upstream issue number, and the decision record links to it. The journal
  (`plans/journals/2026-10-20-cooked-the-tui-framework.md`) records the failed-task hang, the
  bundle growth and the wrong local Node version — the kind of thing a future reader will
  otherwise rediscover.
- **The entry-point split is a good shape.** `runProgram` separating "parse" from "route the
  outcome" is what lets a test drive a program that throws, and it is the shape the module flow
  needs.
- **The capture helper was extracted rather than copied**, and it restores the stream in a
  `finally`.

## Recommended actions

1. **Stop the clack spinner from owning the process.** Either hand-roll the animated spinner in
   `core/ui`, or take back the `unhandledRejection` handler right after `start()`. While the
   spinner runs, a detached rejection must not be able to end the process with exit 0, and SIGINT
   must still terminate the CLI. (Blocker, finding 1.)
2. **Render the failure once, on stderr.** Change the catch in `runTasks` so the stdout line says
   the task failed without repeating the message, and let `renderError` own the message and the
   hint. (Major, finding 2.)
3. **Register the unknown-command fallback inside `runProgram`**, not in `main`, so the export and
   the entry point agree. (Major, finding 3.)
4. **Split the terminal question from the prompt question** before the first prompt lands, and
   correct the docs that call `isInteractive` the one rule. (Minor, finding 4.)
5. **Pin the branches that exist**: the `CI` allow-list, the progress callback, a task that
   returns nothing, a successful task on a terminal, and a plain `Error` through `runProgram`.
   (Minor, findings 5 and 7.)
6. **Assert the cursor codes, not "no ANSI"**, in the piped tests, and say in the docs that colour
   follows `FORCE_COLOR`. (Minor, finding 6.)
7. **Fix the four doc disagreements**: "Three exports", the banner that does not exist, the
   exit-code row still under "Not started", and decision 0004's claim that commands may not
   import clack. (Nits, findings 11 to 14.)
8. **Share `messageOf`** between the two error writers, and decide on one stderr format. (Minor,
   findings 9 and 10.)

## Metrics

- Type coverage: not measured, no coverage tool is configured. The new code carries no `any`, no
  type assertions and no casts, and `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch` and `exactOptionalPropertyTypes` are all on
  (`tsconfig.json:6-20`). `pnpm typecheck` is clean.
- Test coverage: not measured, no coverage tool is configured. `pnpm test` is green: 5 files, 32
  tests. The new layer's branches are covered unevenly — the `isInteractive` matrix, the progress
  callback, the empty-result fallback and the `reportFatalError` route through `runProgram` are
  not (finding 7).
- Linting issues: 0. `pnpm lint` is clean, which also proves the Prettier formatting, because
  `eslint-plugin-prettier` reports it as a lint error.
- Import order: clean, and the non-obvious ordering in the new test files (a `./support/…` import
  before a `../src/…` import) is what `import-x/order` with the repository's group list actually
  enforces. Verified against the rule in isolation, not assumed.
- File roles: every new file carries a suffix from the table in the plan
  (`.ui.ts`, `.error.ts`, `.constant.ts`), and every name is kebab-case. One file holds two
  concerns (finding 17).
- Lines: `src/core/ui/terminal.ui.ts` is 126 lines, under the 200-line split threshold in
  `docs/code-standards.md:154`.

## Unresolved questions

1. Should the layer keep clack's spinner at all? The findings above push towards a hand-rolled
   animation, which is a larger change than this review assumed. If clack's spinner stays, the
   `unhandledRejection` mitigation is fragile and the SIGINT behaviour stays wrong, and that
   should be a conscious decision rather than an accident.
2. What should a piped run look like exactly? The fallback prints a guide bar per line and a
   guide bar per progress update, so one task with two updates is seven lines. Whether a
   consumer-facing format is wanted is a product decision this change does not make.
3. Which flag names the non-interactive path for the first prompt (`--yes`, `--defaults`)? The
   research report leaves it to T4, and it decides what the prompt guard's `CliError` hint says.
4. Is the "CI marker" the single `CI` variable, or a set? The code reads one variable; the docs
   say "a CI marker" as if it were a category. The current choice is right for GitHub Actions,
   GitLab CI and Circle, which all set `CI=true`, but the doc should say which.
