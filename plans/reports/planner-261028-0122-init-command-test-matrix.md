# `jss-devtools init`: every use case run on the Mac

Run 2026-10-28 by the planner, against the built bundle of commit `2970e72` (`dist/cli.mjs`, the
same `init` code that is live). Every case ran in its own empty folder.

Environment: macOS (Darwin 25.6.0, arm64), Node 24.11.0, npm 11.6.1, pnpm 11.24.0, yarn 1.22.22,
bun 1.3.8, git 2.55.0, network on (real installs from the npm registry).

How each case was measured: the harness snapshots the folder before and after, runs
`node dist/cli.mjs init …` with stdout and stderr captured apart, and records the exit code. The
interactive cases (I-) run in a 120×40 pty driven by `expect`, pressing real keys (arrows, Enter,
Ctrl+C). Where a case says "checks after the run", the harness then ran the project's own scripts
and two real commits (a bad message, then a conventional one) to prove the hooks fire. "Missing
tool" cases run with a `PATH` that holds only the tools named; "yarn 4" is a stub that prints
4.5.1; "install fails" points npm at an unreachable registry.

## Result

Every case exits with the code the decisions call for. All four package managers create a project
that installs, lints, typechecks, builds, runs, and rejects a non-conventional commit; existing mode
sets up a plain TypeScript project with each of them, using the manager it detects, without
duplicating a dependency the project already declares. Nothing was written by any case that exits 1
before the write step, and every cancel path (No, Ctrl+C at either question) leaves no folder.

## Issues to decide on

Ordered by how likely a user is to hit them. None changes an exit code.

| # | Case | What happens | Why it matters | Suggested fix |
|---|---|---|---|---|
| #1 | CR13 | `init my-app` where `my-app` is a **file** says `my-app is not empty; to set up the project in it: cd my-app && jss-devtools init` | The hint cannot work: `cd` into a file fails | Say `my-app is a file; pick another name` |
| #2 | CR11 | `init .` in an empty folder works, then ends with `next: cd ., bun run dev` (and an install failure would say `cd . && …`) | Harmless but looks broken | Drop the `cd` part when the target is the current folder |
| #3 | EX13 | A broken `package.json` exits 1 with only `Unexpected end of JSON input` | Breaks the "what was found + next step" rule: it does not name the file | `package.json is not valid JSON (Unexpected end of JSON input); fix it, then rerun` |
| #4 | EX7 | With `-f`, a legacy `.eslintrc.json` is left in place (not listed, not deleted) | ESLint 10 ignores `.eslintrc*`, so it is a dead file that suggests a second config | Decide: leave it (current), list it as a conflict, or delete it with `-f` |
| #5 | EX10, I2 | The summary counts a deletion as written: `Dry run: 12 files would be written` when one entry is `- .prettierrc.yaml`; the confirm says `write N files`; "1 files" is possible | Wording only | `12 changes (11 written, 1 deleted)`, singular for one |
| #6 | CR1-CR4 | The package manager's install output prints outside the clack frame, between the plan and the outro, with no step title; the `package.json` sort that follows prints nothing | Readability: the user sees a block of npm/pnpm output with no "installing…" line before it | Decide: add `installing with <pm>` and `sorting package.json` step lines, or keep it raw |
| #7 | CR2 | `typescript-eslint` installed as 8.72.1 though the pinned table says 8.72.0 | Expected from the decided `^x.y.z` ranges; shown here because it is the drift the e2e cannot freeze | None unless the range decision changes |
| #8 | CR15 | `--dry-run` without `--pm` never asks, even in a terminal, and plans for npm | `--help` says "asked when omitted, npm with --yes" and does not mention `--dry-run` | Add "and with --dry-run" to the `--pm` help line |

By design, recorded so it is not mistaken for a bug: `--dry-run` with conflicting files exits 1
with the list (EX9), because every check runs before the plan; `--dry-run -f` shows the plan (EX10).

Totals: 63 cases, 56 pass, 7 pass with an issue, 0 fail.

## Matrix

Verdict: PASS behaves as decided; ISSUE has the expected exit code but something to decide on (see Issues); FAIL has the wrong exit code. Files: `+` created, `~` modified, `-` deleted, relative to the folder init works on; lockfiles and `.husky/_/*` are listed under "by tools".

| ID | Scenario | Command (cwd, env) | Expected | Exit want/got | Console: last line | Files | Checks after the run | Time | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| H1 | Help: init --help | `jss-devtools init --help` | usage, options with defaults, examples; no banner when piped | 0 / 0 |   $ jss-devtools init -f                  replace existing ESLint, Prettier and commitlint configs | none |  | 0.0s | PASS |
| CR1 | Create: create with npm | `jss-devtools init my-app --pm npm -y` | folder my-app with 13-14 files, git repo on main, npm install, sorted package.json, outro "next: cd my-app, npm run dev" | 0 / 0 | next: cd my-app, npm run dev | +14: .editorconfig, .git, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs, package.json, src/main.ts, tsconfig.json<br>by tools: .husky/_/*, package-lock.json | lint ok, typecheck ok, build ok, start "Hello from my-app", hooksPath .husky/_, branch main, bad commit msg rejected, good commit committed | 13.1s | PASS |
| CR2 | Create: create with pnpm | `jss-devtools init my-app --pm pnpm -y` | folder my-app with 13-14 files, git repo on main, pnpm install, sorted package.json, outro "next: cd my-app, pnpm run dev" | 0 / 0 | next: cd my-app, pnpm run dev | +15: .editorconfig, .git, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs, package.json, pnpm-workspace.yaml, src/main.ts, tsconfig.json<br>by tools: .husky/_/*, pnpm-lock.yaml | lint ok, typecheck ok, build ok, start "Hello from my-app", hooksPath .husky/_, branch main, bad commit msg rejected, good commit committed | 4.3s | ISSUE (#6, #7) |
| CR3 | Create: create with yarn | `jss-devtools init my-app --pm yarn -y` | folder my-app with 13-14 files, git repo on main, yarn install, sorted package.json, outro "next: cd my-app, yarn run dev" | 0 / 0 | next: cd my-app, yarn run dev | +14: .editorconfig, .git, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs, package.json, src/main.ts, tsconfig.json<br>by tools: .husky/_/*, yarn.lock | lint ok, typecheck ok, build ok, start "Hello from my-app", hooksPath .husky/_, branch main, bad commit msg rejected, good commit committed | 31.9s | PASS |
| CR4 | Create: create with bun | `jss-devtools init my-app --pm bun -y` | folder my-app with 13-14 files, git repo on main, bun install, sorted package.json, outro "next: cd my-app, bun run dev" | 0 / 0 | next: cd my-app, bun run dev | +14: .editorconfig, .git, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs, package.json, src/main.ts, tsconfig.json<br>by tools: .husky/_/*, bun.lock | lint ok, typecheck ok, build ok, start "Hello from my-app", hooksPath .husky/_, branch main, bad commit msg rejected, good commit committed | 2.1s | PASS |
| CR5 | Create: --no-vscode | `jss-devtools init my-app --pm bun -y --no-vscode` | no .vscode/ folder | 0 / 0 | next: cd my-app, bun run dev | +12: .editorconfig, .git, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, commitlint.config.mjs, eslint.config.mjs, package.json, src/main.ts, tsconfig.json<br>by tools: .husky/_/*, bun.lock |  | 1.0s | PASS |
| CR6 | Create: nested path apps/my-app | `jss-devtools init apps/my-app --pm bun -y` | creates apps/my-app; hint "cd apps/my-app"; package name my-app | 0 / 0 | next: cd apps/my-app, bun run dev | +14: .editorconfig, .git, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs, package.json, src/main.ts, tsconfig.json<br>by tools: .husky/_/*, bun.lock |  | 1.0s | PASS |
| CR7 | Create: parent path ../x | `jss-devtools init ../x --pm bun -y`<br>cwd: here | creates ../x; hint "cd ../x" | 0 / 0 | next: cd ../x, bun run dev | +14: .editorconfig, .git, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs, package.json, src/main.ts, tsconfig.json<br>by tools: .husky/_/*, bun.lock |  | 0.9s | PASS |
| CR8 | Create: folder "My App" | `jss-devtools init "My App" --pm bun -y` | folder "My App", package name my-app, hint quoted | 0 / 0 | next: cd 'My App', bun run dev | +14: .editorconfig, .git, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs, package.json, src/main.ts, tsconfig.json<br>by tools: .husky/_/*, bun.lock | package.json name: my-app | 1.0s | PASS |
| CR9 | Create: folder "日本" (no valid package name) | `jss-devtools init 日本 --pm bun -y` | exit 1 before any write | 1 / 1 | 日本 has no valid npm package name; use a folder name with Latin letters or digits | none |  | 0.0s | PASS |
| CR10 | Create: target is an existing empty folder | `jss-devtools init my-app --pm bun -y` | creates inside the empty folder | 0 / 0 | next: cd my-app, bun run dev | +14: .editorconfig, .git, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs, package.json, src/main.ts, tsconfig.json<br>by tools: .husky/_/*, bun.lock |  | 1.0s | PASS |
| CR11 | Create: "." in an empty folder | `jss-devtools init . --pm bun -y`<br>cwd: empty | creates in the current folder; no "cd" hint needed | 0 / 0 | next: cd ., bun run dev | +14: .editorconfig, .git, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs, package.json, src/main.ts, tsconfig.json<br>by tools: .husky/_/*, bun.lock |  | 1.1s | ISSUE (#2) |
| CR12 | Create: target folder not empty | `jss-devtools init my-app -y` | exit 1, says not empty, suggests cd + init | 1 / 1 | my-app is not empty; to set up the project in it: cd my-app && jss-devtools init | none |  | 0.0s | PASS |
| CR13 | Create: target is a file | `jss-devtools init my-app -y` | exit 1, says it is a file | 1 / 1 | my-app is not empty; to set up the project in it: cd my-app && jss-devtools init | none |  | 0.0s | ISSUE (#1) |
| CR14 | Create: --dry-run --pm pnpm | `jss-devtools init my-app --pm pnpm --dry-run` | plan with + marks, nothing written | 0 / 0 | Dry run: 14 files would be written | none |  | 0.2s | PASS |
| CR15 | Create: --dry-run without --pm (not a terminal) | `jss-devtools init my-app --dry-run` | plan for npm, nothing written | 0 / 0 | Dry run: 13 files would be written | none |  | 0.1s | ISSUE (#8) |
| CR16 | Create: no -y, not a terminal | `jss-devtools init my-app` | exit 1 "run it in a terminal, or pass --yes" | 1 / 1 | run it in a terminal, or pass --yes | none |  | 0.0s | PASS |
| CR17 | Create: no -y, CI=1 | `jss-devtools init my-app`<br>env: CI | exit 1 "run it in a terminal, or pass --yes" | 1 / 1 | run it in a terminal, or pass --yes | none |  | 0.0s | PASS |
| CR18 | Create: install fails (registry unreachable) | `jss-devtools init my-app --pm npm -y`<br>env: npm_config_registry, npm_config_fetch_retries, npm_config_fetch_timeout | files written, exit 1 "install failed ... To finish: cd my-app && npm install" | 1 / 1 | install failed; the files are written. To finish: cd my-app && npm install | +14: .editorconfig, .git, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs, package.json, src/main.ts, tsconfig.json |  | 0.3s | PASS |
| CR19 | Create: --pm pnpm, pnpm not installed | `jss-devtools init my-app --pm pnpm -y`<br>env: PATH limited | exit 1 "pnpm is not installed; install it, or pick another with --pm" | 1 / 1 | pnpm is not installed; install it, or pick another with --pm | none |  | 0.0s | PASS |
| CR20 | Create: git not installed | `jss-devtools init my-app --pm npm -y`<br>env: PATH limited | exit 1 "git is not installed" | 1 / 1 | git is not installed | none |  | 0.0s | PASS |
| CR21 | Create: --pm yarn with yarn 4 (stub) | `jss-devtools init my-app --pm yarn -y`<br>env: PATH with stub | exit 1 "yarn 4.5.1 is not supported" | 1 / 1 | yarn 4.5.1 is not supported; supported: npm, yarn 1, pnpm, bun | none |  | 0.5s | PASS |
| CR22 | Create: -f with a folder | `jss-devtools init my-app -f -y` | exit 1, -f only for existing mode | 1 / 1 | -f, --force only applies when setting up an existing project; a new project has nothing to replace | none |  | 0.0s | PASS |
| CR23 | Create: --framework react | `jss-devtools init my-app --framework react -y` | exit 1 "react is not supported yet; only node is" | 1 / 1 | react is not supported yet; only node is | none |  | 0.0s | PASS |
| CR24 | Create: --framework vue (not a choice) | `jss-devtools init my-app --framework vue` | commander error listing the choices | 1 / 1 | error: option '--framework <name>' argument 'vue' is invalid. Allowed choices are node, react, rn, next, nest. | none |  | 0.0s | PASS |
| CR25 | Create: --pm deno (not a choice) | `jss-devtools init my-app --pm deno` | commander error listing the choices | 1 / 1 | error: option '--pm <name>' argument 'deno' is invalid. Allowed choices are npm, yarn, pnpm, bun. | none |  | 0.0s | PASS |
| CR26 | Create: two folders | `jss-devtools init a b` | commander error: too many arguments | 1 / 1 | error: too many arguments for 'init'. Expected 1 argument but got 2: a, b. | none |  | 0.0s | PASS |
| CR27 | Create: unknown option | `jss-devtools init my-app --foo` | commander error: unknown option | 1 / 1 | error: unknown option '--foo' | none |  | 0.0s | PASS |
| EX1 | Existing: plain TS project, npm | `jss-devtools init -y` | owned configs created, package.json merged, npm install with the detected manager, hooks active, outro "done" | 0 / 0 | done | +10: .editorconfig, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs<br>~1: package.json<br>by tools: .husky/_/*, package-lock.json | typescript in devDependencies: no, packageManager npm@11.6.1, lint ok (after format), typecheck ok, hooksPath .husky/_ | 3.6s | PASS |
| EX2 | Existing: plain TS project, pnpm | `jss-devtools init -y` | owned configs created, package.json merged, pnpm install with the detected manager, hooks active, outro "done" | 0 / 0 | done | +11: .editorconfig, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs, pnpm-workspace.yaml<br>~1: package.json<br>by tools: .husky/_/*, pnpm-lock.yaml | typescript in devDependencies: no, packageManager pnpm@11.24.0, lint ok (after format), typecheck ok, hooksPath .husky/_ | 3.8s | PASS |
| EX3 | Existing: plain TS project, yarn | `jss-devtools init -y` | owned configs created, package.json merged, yarn install with the detected manager, hooks active, outro "done" | 0 / 0 | done | +10: .editorconfig, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs<br>~1: package.json<br>by tools: .husky/_/*, yarn.lock | typescript in devDependencies: no, packageManager yarn@1.22.22, lint ok (after format), typecheck ok, hooksPath .husky/_ | 18.1s | PASS |
| EX4 | Existing: plain TS project, bun | `jss-devtools init -y` | owned configs created, package.json merged, bun install with the detected manager, hooks active, outro "done" | 0 / 0 | done | +10: .editorconfig, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs<br>~1: package.json<br>by tools: .husky/_/*, bun.lock | typescript in devDependencies: no, packageManager bun@1.3.8, lint ok (after format), typecheck ok, hooksPath .husky/_ | 1.1s | PASS |
| EX5 | Existing: rerun on a set-up project | `jss-devtools init -y` | exit 1 listing the files, suggests --force and --no-vscode | 1 / 1 | these files already exist: eslint.config.mjs, .prettierrc.json, commitlint.config.mjs, .editorconfig, .vscode/settings.json; to replace them: jss-devtools init --force; or pass --no-vscode | none |  | 0.1s | PASS |
| EX6 | Existing: only .vscode/settings.json exists, --no-vscode | `jss-devtools init -y --no-vscode` | sets up, leaves .vscode alone | 0 / 0 | done | +8: .editorconfig, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, commitlint.config.mjs, eslint.config.mjs<br>~1: package.json<br>by tools: .husky/_/*, bun.lock |  | 0.9s | PASS |
| EX7 | Existing: -f -y with other config names and package.json keys | `jss-devtools init -f -y` | owned files replaced, .prettierrc.yaml and .eslintrc.json deleted, prettier and commitlint keys removed | 0 / 0 | done | +9: .editorconfig, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs<br>~2: .prettierrc.json, package.json<br>-1: .prettierrc.yaml<br>by tools: .husky/_/*, bun.lock | prettier key: removed, commitlint key: removed, .eslintrc.json: KEPT | 1.0s | ISSUE (#4) |
| EX8 | Existing: --dry-run on a plain project | `jss-devtools init --dry-run` | plan with + and ~ marks, nothing written | 0 / 0 | Dry run: 12 files would be written | none |  | 0.2s | PASS |
| EX9 | Existing: --dry-run with conflicts | `jss-devtools init --dry-run` | decision: preflight stops before the plan | 1 / 1 | these files already exist: .prettierrc.json; to replace them: jss-devtools init --force | none |  | 0.1s | PASS |
| EX10 | Existing: --dry-run -f with conflicts | `jss-devtools init --dry-run -f` | plan including - for the deleted name, nothing written | 0 / 0 | Dry run: 12 files would be written | none |  | 0.1s | ISSUE (#5) |
| EX11 | Existing: --pm without a folder | `jss-devtools init --pm npm -y` | exit 1 "--pm only applies when creating a project" | 1 / 1 | --pm only applies when creating a project; here the package manager is detected | none |  | 0.0s | PASS |
| EX12 | Existing: no package.json | `jss-devtools init -y` | exit 1 "no package.json here; to create a project: jss-devtools init <name>" | 1 / 1 | no package.json here; to create a project: jss-devtools init <name> | none |  | 0.0s | PASS |
| EX13 | Existing: package.json is invalid JSON | `jss-devtools init -y` | exit 1 naming the JSON error | 1 / 1 | Unexpected end of JSON input | none |  | 0.0s | ISSUE (#3) |
| EX14 | Existing: package.json has workspaces | `jss-devtools init -y` | exit 1 "monorepos are not supported yet" | 1 / 1 | monorepos are not supported yet | none |  | 0.0s | PASS |
| EX15 | Existing: pnpm-workspace.yaml with packages | `jss-devtools init -y` | exit 1 "monorepos are not supported yet" | 1 / 1 | monorepos are not supported yet | none |  | 0.0s | PASS |
| EX16 | Existing: pnpm-workspace.yaml with settings only, 4-space indent | `jss-devtools init -y` | esbuild and unrs-resolver added with 4 spaces, sharp false and strictPeerDependencies false kept | 0 / 0 | done | +10: .editorconfig, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs<br>~2: package.json, pnpm-workspace.yaml<br>by tools: .husky/_/*, pnpm-lock.yaml | allowBuilds: ⏎     sharp: false ⏎     esbuild: true ⏎     unrs-resolver: true ⏎  ⏎ strictPeerDependencies: false | 3.8s | PASS |
| EX17 | Existing: pnpm-workspace.yaml with pnpm placeholders | `jss-devtools init -y` | placeholders replaced by true, install passes | 0 / 0 | done | +10: .editorconfig, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs<br>~2: package.json, pnpm-workspace.yaml<br>by tools: .husky/_/*, pnpm-lock.yaml | allowBuilds: ⏎   esbuild: true ⏎   unrs-resolver: true | 4.2s | PASS |
| EX18 | Existing: pnpm-workspace.yaml flow style | `jss-devtools init -y` | exit 1 naming the entries to add by hand | 1 / 1 | pnpm-workspace.yaml cannot be extended line by line; add these entries by hand: allowBuilds.esbuild: true, allowBuilds.unrs-resolver: true | none |  | 0.2s | PASS |
| EX19 | Existing: no tsconfig.json | `jss-devtools init -y` | exit 1 "no tsconfig.json here; ..." | 1 / 1 | no tsconfig.json here; init sets up TypeScript projects. To create one: jss-devtools init <name> | none |  | 0.0s | PASS |
| EX20 | Existing: not a git repository | `jss-devtools init -y` | exit 1 "not a git repository; run git init first" | 1 / 1 | not a git repository; run git init first | none |  | 0.0s | PASS |
| EX21 | Existing: subfolder of a git repository | `jss-devtools init -y`<br>cwd: pkg | exit 1 "the git root is ..; run jss-devtools init there" | 1 / 1 | the git root is ..; run jss-devtools init there | none |  | 0.0s | PASS |
| EX22 | Existing: core.hooksPath=.githooks | `jss-devtools init -y` | exit 1 naming the hooks path and how to unset it | 1 / 1 | git hooks are managed by .githooks (core.hooksPath); remove it with git config --unset core.hooksPath to use husky | none |  | 0.0s | PASS |
| EX23 | Existing: core.hooksPath=.husky (husky 4 style) | `jss-devtools init -y` | accepted; husky sets .husky/_ | 0 / 0 | done | +10: .editorconfig, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs<br>~1: package.json<br>by tools: .husky/_/*, bun.lock | hooksPath .husky/_ | 0.9s | PASS |
| EX24 | Existing: packageManager yarn@4 | `jss-devtools init -y` | exit 1 "yarn@berry is not supported" | 1 / 1 | yarn@berry is not supported; supported: npm, yarn 1, pnpm, bun | none |  | 0.0s | PASS |
| EX25 | Existing: detected bun not installed | `jss-devtools init -y`<br>env: PATH limited | exit 1 "bun is not installed; install it" | 1 / 1 | bun is not installed; install it | none |  | 0.0s | PASS |
| EX26 | Existing: shared files merged (.gitignore, hook, user scripts) | `jss-devtools init -y` | user lines kept and init lines appended; user lint script kept | 0 / 0 | done | +8: .editorconfig, .husky/commit-msg, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs<br>~3: .gitignore, .husky/pre-commit, package.json<br>by tools: .husky/_/*, bun.lock | .gitignore head: "# mine ⏎ secret.txt", pre-commit: "echo user-hook ⏎ bun x lint-staged", lint script: "echo mine" | 0.9s | PASS |
| EX27 | Existing: install fails (registry unreachable) | `jss-devtools init -y`<br>env: npm_config_registry, npm_config_fetch_retries, npm_config_fetch_timeout | files written, exit 1 "install failed ... To finish: npm install" | 1 / 1 | install failed; the files are written. To finish: npm install | +10: .editorconfig, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs<br>~1: package.json |  | 0.3s | PASS |
| EX28 | Existing: no -y, not a terminal | `jss-devtools init` | exit 1 "run it in a terminal, or pass --yes" | 1 / 1 | run it in a terminal, or pass --yes | none |  | 0.0s | PASS |
| EX29 | Existing: git worktree (.git is a file) | `jss-devtools init -y`<br>cwd: wt | accepted like a normal repo | 0 / 0 | done | +10: .editorconfig, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs<br>~1: package.json<br>by tools: .husky/_/*, bun.lock |  | 0.9s | PASS |
| I1 | Interactive: pick pnpm with arrows, confirm Enter | `jss-devtools init my-app` | banner, select, plan, confirm, install with pnpm | 0 / 0 | next: cd my-app, pnpm run dev | +15: .editorconfig, .git, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs, package.json, pnpm-workspace.yaml, src/main.ts, tsconfig.json<br>by tools: .husky/_/*, pnpm-lock.yaml | packageManager pnpm@11.24.0 | 5.0s | PASS |
| I2 | Interactive: answer No at the confirm | `jss-devtools init my-app` | exit 1 "cancelled, nothing written", no folder | 1 / 1 | cancelled, nothing written | none |  | 1.1s | PASS |
| I3 | Interactive: Ctrl+C at the package manager question | `jss-devtools init my-app` | exit 1 "cancelled, nothing written" | 1 / 1 | cancelled, nothing written | none |  | 0.5s | PASS |
| I4 | Interactive: Ctrl+C at the confirm | `jss-devtools init my-app` | exit 1 "cancelled, nothing written" | 1 / 1 | cancelled, nothing written | none |  | 1.1s | PASS |
| I5 | Interactive: existing project, confirm Enter | `jss-devtools init` | no package manager question, confirm, install with bun | 0 / 0 | done | +10: .editorconfig, .gitignore, .husky/commit-msg, .husky/pre-commit, .prettierignore, .prettierrc.json, .vscode/extensions.json, .vscode/settings.json, commitlint.config.mjs, eslint.config.mjs<br>~1: package.json<br>by tools: .husky/_/*, bun.lock |  | 2.9s | PASS |
| I6 | Interactive: help in a terminal | `jss-devtools init --help` | banner before the help | 0 / 0 |   $ jss-devtools init -f                  replace existing ESLint, Prettier and commitlint configs | none |  | 0.0s | PASS |

## Console output per case

stdout and stderr exactly as printed (colours stripped; interactive cases are one pty stream, so redraws repeat lines).

### H1: init --help

`jss-devtools init --help` → exit 0

stdout:

```text
Usage: jss-devtools init [options] [dir]
create a project, or set up the current one
Arguments:
  dir                 create a new project in this folder (missing or empty);
                      without it, set up the project in the current folder
Options:
  --framework <name>  the preset to apply; only node is built so far (choices:
                      "node", "react", "rn", "next", "nest", default: "node")
  --pm <name>         package manager for a new project; asked when omitted, npm
                      with --yes. Not accepted without <dir>: the current
                      folder's manager is detected (choices: "npm", "yarn",
                      "pnpm", "bun")
  -f, --force         replace the config files init owns when they already
                      exist, and delete their other names (default: off; init
                      stops and lists them)
  --no-vscode         do not write .vscode/ (default: written)
  -y, --yes           do not ask; take the default answers (default: off; ask in
                      a terminal)
  --dry-run           show the files that would change, write and install
                      nothing (default: off)
  -h, --help          display help for command
Examples:
  $ jss-devtools init my-app              create my-app, asking for the package manager
  $ jss-devtools init my-app --pm pnpm -y create my-app with pnpm, no questions (CI)
  $ jss-devtools init                     set up the project in the current folder
  $ jss-devtools init --dry-run           show what would change, write nothing
  $ jss-devtools init -f                  replace existing ESLint, Prettier and commitlint configs
```

stderr:

```text
(empty)
```

### CR1: create with npm

`jss-devtools init my-app --pm npm -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + .vscode/settings.json
│  + .vscode/extensions.json
> my-app@0.0.0 prepare
> husky
added 314 packages, and audited 315 packages in 12s
76 packages are looking for funding
  run `npm fund` for details
found 0 vulnerabilities
└  next: cd my-app, npm run dev
```

stderr:

```text
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated string-similarity@4.0.4: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
```

### CR2: create with pnpm

`jss-devtools init my-app --pm pnpm -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
… 18 lines …
+ @commitlint/config-conventional 21.2.4
+ @eslint/js 10.0.1
+ @types/node 24.19.2 (26.6.5 is available)
+ eslint 10.13.0
+ eslint-config-prettier 10.1.8
+ eslint-plugin-autofix 2.2.0
+ eslint-plugin-import-x 4.17.1
+ eslint-plugin-prefer-arrow-functions 3.10.2
+ eslint-plugin-prettier 5.5.7
+ globals 17.13.0
+ husky 9.1.7
+ lint-staged 17.6.0
+ prettier 3.9.10
+ prettier-package-json 2.8.0
+ tsc-alias 1.9.9
+ tsx 4.23.15
+ typescript 6.0.3 (7.0.2 is available)
+ typescript-eslint 8.72.1
Done in 2.5s using pnpm v11.24.0
└  next: cd my-app, pnpm run dev
```

stderr:

```text
(empty)
```

### CR3: create with yarn

`jss-devtools init my-app --pm yarn -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + .vscode/settings.json
│  + .vscode/extensions.json
yarn install v1.22.22
info No lockfile found.
[1/5] Validating package.json...
[2/5] Resolving packages...
[3/5] Fetching packages...
[4/5] Linking dependencies...
[5/5] Building fresh packages...
success Saved lockfile.
$ husky
Done in 30.73s.
└  next: cd my-app, yarn run dev
```

stderr:

```text
(node:15002) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)
warning eslint-plugin-autofix > string-similarity@4.0.4: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
warning prettier-package-json > glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
warning prettier-package-json > glob > inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
```

### CR4: create with bun

`jss-devtools init my-app --pm bun -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + .vscode/settings.json
│  + .vscode/extensions.json
bun install v1.3.8 (b64edcb4)
+ @commitlint/cli@21.2.4
+ @commitlint/config-conventional@21.2.4
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript@6.0.3 (v7.0.2 available)
+ typescript-eslint@8.72.1
254 packages installed [1473.00ms]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  next: cd my-app, bun run dev
```

stderr:

```text
Resolving dependencies
Resolved, downloaded and extracted [229]
Saved lockfile
$ husky
```

### CR5: --no-vscode

`jss-devtools init my-app --pm bun -y --no-vscode` → exit 0

stdout:

```text
┌   jss-devtools init
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
bun install v1.3.8 (b64edcb4)
+ @commitlint/cli@21.2.4
+ @commitlint/config-conventional@21.2.4
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript@6.0.3 (v7.0.2 available)
+ typescript-eslint@8.72.1
254 packages installed [402.00ms]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  next: cd my-app, bun run dev
```

stderr:

```text
Resolving dependencies
Resolved, downloaded and extracted [0]
Saved lockfile
$ husky
```

### CR6: nested path apps/my-app

`jss-devtools init apps/my-app --pm bun -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + .vscode/settings.json
│  + .vscode/extensions.json
bun install v1.3.8 (b64edcb4)
+ @commitlint/cli@21.2.4
+ @commitlint/config-conventional@21.2.4
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript@6.0.3 (v7.0.2 available)
+ typescript-eslint@8.72.1
254 packages installed [499.00ms]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  next: cd apps/my-app, bun run dev
```

stderr:

```text
Resolving dependencies
Resolved, downloaded and extracted [0]
Saved lockfile
$ husky
```

### CR7: parent path ../x

`jss-devtools init ../x --pm bun -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + .vscode/settings.json
│  + .vscode/extensions.json
bun install v1.3.8 (b64edcb4)
+ @commitlint/cli@21.2.4
+ @commitlint/config-conventional@21.2.4
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript@6.0.3 (v7.0.2 available)
+ typescript-eslint@8.72.1
254 packages installed [394.00ms]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  next: cd ../x, bun run dev
```

stderr:

```text
Resolving dependencies
Resolved, downloaded and extracted [0]
Saved lockfile
$ husky
```

### CR8: folder "My App"

`jss-devtools init "My App" --pm bun -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + .vscode/settings.json
│  + .vscode/extensions.json
bun install v1.3.8 (b64edcb4)
+ @commitlint/cli@21.2.4
+ @commitlint/config-conventional@21.2.4
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript@6.0.3 (v7.0.2 available)
+ typescript-eslint@8.72.1
254 packages installed [421.00ms]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  next: cd 'My App', bun run dev
```

stderr:

```text
Resolving dependencies
Resolved, downloaded and extracted [0]
Saved lockfile
$ husky
```

### CR9: folder "日本" (no valid package name)

`jss-devtools init 日本 --pm bun -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  日本 has no valid npm package name; use a folder name with Latin letters or digits
```

### CR10: target is an existing empty folder

`jss-devtools init my-app --pm bun -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + .vscode/settings.json
│  + .vscode/extensions.json
bun install v1.3.8 (b64edcb4)
+ @commitlint/cli@21.2.4
+ @commitlint/config-conventional@21.2.4
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript@6.0.3 (v7.0.2 available)
+ typescript-eslint@8.72.1
254 packages installed [403.00ms]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  next: cd my-app, bun run dev
```

stderr:

```text
Resolving dependencies
Resolved, downloaded and extracted [0]
Saved lockfile
$ husky
```

### CR11: "." in an empty folder

`jss-devtools init . --pm bun -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + .vscode/settings.json
│  + .vscode/extensions.json
bun install v1.3.8 (b64edcb4)
+ @commitlint/cli@21.2.4
+ @commitlint/config-conventional@21.2.4
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript@6.0.3 (v7.0.2 available)
+ typescript-eslint@8.72.1
254 packages installed [430.00ms]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  next: cd ., bun run dev
```

stderr:

```text
Resolving dependencies
Resolved, downloaded and extracted [0]
Saved lockfile
$ husky
```

### CR12: target folder not empty

`jss-devtools init my-app -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  my-app is not empty; to set up the project in it: cd my-app && jss-devtools init
```

### CR13: target is a file

`jss-devtools init my-app -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  my-app is not empty; to set up the project in it: cd my-app && jss-devtools init
```

### CR14: --dry-run --pm pnpm

`jss-devtools init my-app --pm pnpm --dry-run` → exit 0

stdout:

```text
┌   jss-devtools init
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + .vscode/settings.json
│  + .vscode/extensions.json
│  + pnpm-workspace.yaml
└  Dry run: 14 files would be written
```

stderr:

```text
(empty)
```

### CR15: --dry-run without --pm (not a terminal)

`jss-devtools init my-app --dry-run` → exit 0

stdout:

```text
┌   jss-devtools init
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + .vscode/settings.json
│  + .vscode/extensions.json
└  Dry run: 13 files would be written
```

stderr:

```text
(empty)
```

### CR16: no -y, not a terminal

`jss-devtools init my-app` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  run it in a terminal, or pass --yes
```

### CR17: no -y, CI=1

`jss-devtools init my-app` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  run it in a terminal, or pass --yes
```

### CR18: install fails (registry unreachable)

`jss-devtools init my-app --pm npm -y` → exit 1

stdout:

```text
┌   jss-devtools init
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + .vscode/settings.json
│  + .vscode/extensions.json
```

stderr:

```text
npm error code ECONNREFUSED
npm error syscall connect
npm error errno ECONNREFUSED
npm error FetchError: request to http://127.0.0.1:9/@commitlint%2fcli failed, reason: connect ECONNREFUSED 127.0.0.1:9
npm error     at ClientRequest.<anonymous> (/Users/tandm/.nvm/versions/node/v24.11.0/lib/node_modules/npm/node_modules/minipass-fetch/lib/index.js:130:14)
npm error     at ClientRequest.emit (node:events:508:28)
npm error     at emitErrorEvent (node:_http_client:107:11)
npm error     at _destroy (node:_http_client:954:9)
npm error     at onSocketNT (node:_http_client:974:5)
npm error     at process.processTicksAndRejections (node:internal/process/task_queues:91:21) {
npm error   code: 'ECONNREFUSED',
npm error   errno: 'ECONNREFUSED',
npm error   syscall: 'connect',
npm error   address: '127.0.0.1',
npm error   port: 9,
npm error   type: 'system',
npm error   requiredBy: '.'
npm error }
npm error
npm error If you are behind a proxy, please make sure that the
npm error 'proxy' config is set properly.  See: 'npm help config'
npm error A complete log of this run can be found in: /Users/tandm/.npm/_logs/2026-10-27T18_01_06_067Z-debug-0.log
└  install failed; the files are written. To finish: cd my-app && npm install
```

### CR19: --pm pnpm, pnpm not installed

`jss-devtools init my-app --pm pnpm -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  pnpm is not installed; install it, or pick another with --pm
```

### CR20: git not installed

`jss-devtools init my-app --pm npm -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  git is not installed
```

### CR21: --pm yarn with yarn 4 (stub)

`jss-devtools init my-app --pm yarn -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  yarn 4.5.1 is not supported; supported: npm, yarn 1, pnpm, bun
```

### CR22: -f with a folder

`jss-devtools init my-app -f -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  -f, --force only applies when setting up an existing project; a new project has nothing to replace
```

### CR23: --framework react

`jss-devtools init my-app --framework react -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  react is not supported yet; only node is
```

### CR24: --framework vue (not a choice)

`jss-devtools init my-app --framework vue` → exit 1

stdout:

```text
(empty)
```

stderr:

```text
error: option '--framework <name>' argument 'vue' is invalid. Allowed choices are node, react, rn, next, nest.
Usage: jss-devtools init [options] [dir]
create a project, or set up the current one
Arguments:
  dir                 create a new project in this folder (missing or empty);
                      without it, set up the project in the current folder
Options:
  --framework <name>  the preset to apply; only node is built so far (choices:
                      "node", "react", "rn", "next", "nest", default: "node")
  --pm <name>         package manager for a new project; asked when omitted, npm
                      with --yes. Not accepted without <dir>: the current
                      folder's manager is detected (choices: "npm", "yarn",
                      "pnpm", "bun")
  -f, --force         replace the config files init owns when they already
                      exist, and delete their other names (default: off; init
                      stops and lists them)
  --no-vscode         do not write .vscode/ (default: written)
  -y, --yes           do not ask; take the default answers (default: off; ask in
                      a terminal)
  --dry-run           show the files that would change, write and install
                      nothing (default: off)
  -h, --help          display help for command
Examples:
  $ jss-devtools init my-app              create my-app, asking for the package manager
  $ jss-devtools init my-app --pm pnpm -y create my-app with pnpm, no questions (CI)
  $ jss-devtools init                     set up the project in the current folder
  $ jss-devtools init --dry-run           show what would change, write nothing
  $ jss-devtools init -f                  replace existing ESLint, Prettier and commitlint configs
```

### CR25: --pm deno (not a choice)

`jss-devtools init my-app --pm deno` → exit 1

stdout:

```text
(empty)
```

stderr:

```text
error: option '--pm <name>' argument 'deno' is invalid. Allowed choices are npm, yarn, pnpm, bun.
Usage: jss-devtools init [options] [dir]
create a project, or set up the current one
Arguments:
  dir                 create a new project in this folder (missing or empty);
                      without it, set up the project in the current folder
Options:
  --framework <name>  the preset to apply; only node is built so far (choices:
                      "node", "react", "rn", "next", "nest", default: "node")
  --pm <name>         package manager for a new project; asked when omitted, npm
                      with --yes. Not accepted without <dir>: the current
                      folder's manager is detected (choices: "npm", "yarn",
                      "pnpm", "bun")
  -f, --force         replace the config files init owns when they already
                      exist, and delete their other names (default: off; init
                      stops and lists them)
  --no-vscode         do not write .vscode/ (default: written)
  -y, --yes           do not ask; take the default answers (default: off; ask in
                      a terminal)
  --dry-run           show the files that would change, write and install
                      nothing (default: off)
  -h, --help          display help for command
Examples:
  $ jss-devtools init my-app              create my-app, asking for the package manager
  $ jss-devtools init my-app --pm pnpm -y create my-app with pnpm, no questions (CI)
  $ jss-devtools init                     set up the project in the current folder
  $ jss-devtools init --dry-run           show what would change, write nothing
  $ jss-devtools init -f                  replace existing ESLint, Prettier and commitlint configs
```

### CR26: two folders

`jss-devtools init a b` → exit 1

stdout:

```text
(empty)
```

stderr:

```text
error: too many arguments for 'init'. Expected 1 argument but got 2: a, b.
Usage: jss-devtools init [options] [dir]
create a project, or set up the current one
Arguments:
  dir                 create a new project in this folder (missing or empty);
                      without it, set up the project in the current folder
Options:
  --framework <name>  the preset to apply; only node is built so far (choices:
                      "node", "react", "rn", "next", "nest", default: "node")
  --pm <name>         package manager for a new project; asked when omitted, npm
                      with --yes. Not accepted without <dir>: the current
                      folder's manager is detected (choices: "npm", "yarn",
                      "pnpm", "bun")
  -f, --force         replace the config files init owns when they already
                      exist, and delete their other names (default: off; init
                      stops and lists them)
  --no-vscode         do not write .vscode/ (default: written)
  -y, --yes           do not ask; take the default answers (default: off; ask in
                      a terminal)
  --dry-run           show the files that would change, write and install
                      nothing (default: off)
  -h, --help          display help for command
Examples:
  $ jss-devtools init my-app              create my-app, asking for the package manager
  $ jss-devtools init my-app --pm pnpm -y create my-app with pnpm, no questions (CI)
  $ jss-devtools init                     set up the project in the current folder
  $ jss-devtools init --dry-run           show what would change, write nothing
  $ jss-devtools init -f                  replace existing ESLint, Prettier and commitlint configs
```

### CR27: unknown option

`jss-devtools init my-app --foo` → exit 1

stdout:

```text
(empty)
```

stderr:

```text
error: unknown option '--foo'
Usage: jss-devtools init [options] [dir]
create a project, or set up the current one
Arguments:
  dir                 create a new project in this folder (missing or empty);
                      without it, set up the project in the current folder
Options:
  --framework <name>  the preset to apply; only node is built so far (choices:
                      "node", "react", "rn", "next", "nest", default: "node")
  --pm <name>         package manager for a new project; asked when omitted, npm
                      with --yes. Not accepted without <dir>: the current
                      folder's manager is detected (choices: "npm", "yarn",
                      "pnpm", "bun")
  -f, --force         replace the config files init owns when they already
                      exist, and delete their other names (default: off; init
                      stops and lists them)
  --no-vscode         do not write .vscode/ (default: written)
  -y, --yes           do not ask; take the default answers (default: off; ask in
                      a terminal)
  --dry-run           show the files that would change, write and install
                      nothing (default: off)
  -h, --help          display help for command
Examples:
  $ jss-devtools init my-app              create my-app, asking for the package manager
  $ jss-devtools init my-app --pm pnpm -y create my-app with pnpm, no questions (CI)
  $ jss-devtools init                     set up the project in the current folder
  $ jss-devtools init --dry-run           show what would change, write nothing
  $ jss-devtools init -f                  replace existing ESLint, Prettier and commitlint configs
```

### EX1: plain TS project, npm

`jss-devtools init -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
│  + .vscode/settings.json
│  + .vscode/extensions.json
> prepare
> husky
added 314 packages, and audited 315 packages in 3s
76 packages are looking for funding
  run `npm fund` for details
found 0 vulnerabilities
└  done
```

stderr:

```text
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated string-similarity@4.0.4: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
```

### EX2: plain TS project, pnpm

`jss-devtools init -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + pnpm-workspace.yaml
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
│  + .vscode/settings.json
… 17 lines …
+ @commitlint/cli 21.2.4
+ @commitlint/config-conventional 21.2.4
+ @eslint/js 10.0.1
+ @types/node 24.19.2 (26.6.5 is available)
+ eslint 10.13.0
+ eslint-config-prettier 10.1.8
+ eslint-plugin-autofix 2.2.0
+ eslint-plugin-import-x 4.17.1
+ eslint-plugin-prefer-arrow-functions 3.10.2
+ eslint-plugin-prettier 5.5.7
+ globals 17.13.0
+ husky 9.1.7
+ lint-staged 17.6.0
+ prettier 3.9.10
+ prettier-package-json 2.8.0
+ tsc-alias 1.9.9
+ tsx 4.23.15
+ typescript-eslint 8.72.1
Done in 2.1s using pnpm v11.24.0
└  done
```

stderr:

```text
(empty)
```

### EX3: plain TS project, yarn

`jss-devtools init -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
│  + .vscode/settings.json
│  + .vscode/extensions.json
yarn install v1.22.22
info No lockfile found.
[1/4] Resolving packages...
[2/4] Fetching packages...
[3/4] Linking dependencies...
[4/4] Building fresh packages...
success Saved lockfile.
$ husky
Done in 16.94s.
└  done
```

stderr:

```text
warning package.json: No license field
warning demo: No license field
(node:22001) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)
warning eslint-plugin-autofix > string-similarity@4.0.4: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
warning prettier-package-json > glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
warning prettier-package-json > glob > inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
warning Workspaces can only be enabled in private projects.
```

### EX4: plain TS project, bun

`jss-devtools init -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
│  + .vscode/settings.json
│  + .vscode/extensions.json
bun install v1.3.8 (b64edcb4)
+ @commitlint/cli@21.2.4
+ @commitlint/config-conventional@21.2.4
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript-eslint@8.72.1
+ typescript@6.0.3 (v7.0.2 available)
254 packages installed [492.00ms]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  done
```

stderr:

```text
Resolving dependencies
Resolved, downloaded and extracted [0]
Saved lockfile
$ husky
```

### EX5: rerun on a set-up project

`jss-devtools init -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  these files already exist: eslint.config.mjs, .prettierrc.json, commitlint.config.mjs, .editorconfig, .vscode/settings.json; to replace them: jss-devtools init --force; or pass --no-vscode
```

### EX6: only .vscode/settings.json exists, --no-vscode

`jss-devtools init -y --no-vscode` → exit 0

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
bun install v1.3.8 (b64edcb4)
+ @commitlint/cli@21.2.4
+ @commitlint/config-conventional@21.2.4
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript-eslint@8.72.1
+ typescript@6.0.3 (v7.0.2 available)
254 packages installed [404.00ms]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  done
```

stderr:

```text
Resolving dependencies
Resolved, downloaded and extracted [0]
Saved lockfile
$ husky
```

### EX7: -f -y with other config names and package.json keys

`jss-devtools init -f -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + eslint.config.mjs
│  ~ .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
│  + .vscode/settings.json
│  + .vscode/extensions.json
│  - .prettierrc.yaml
bun install v1.3.8 (b64edcb4)
+ @commitlint/cli@21.2.4
+ @commitlint/config-conventional@21.2.4
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript-eslint@8.72.1
+ typescript@6.0.3 (v7.0.2 available)
254 packages installed [447.00ms]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  done
```

stderr:

```text
Resolving dependencies
Resolved, downloaded and extracted [0]
Saved lockfile
$ husky
```

### EX8: --dry-run on a plain project

`jss-devtools init --dry-run` → exit 0

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + pnpm-workspace.yaml
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
│  + .vscode/settings.json
│  + .vscode/extensions.json
└  Dry run: 12 files would be written
```

stderr:

```text
(empty)
```

### EX9: --dry-run with conflicts

`jss-devtools init --dry-run` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  these files already exist: .prettierrc.json; to replace them: jss-devtools init --force
```

### EX10: --dry-run -f with conflicts

`jss-devtools init --dry-run -f` → exit 0

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
│  + .vscode/settings.json
│  + .vscode/extensions.json
│  - .prettierrc.yaml
└  Dry run: 12 files would be written
```

stderr:

```text
(empty)
```

### EX11: --pm without a folder

`jss-devtools init --pm npm -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  --pm only applies when creating a project; here the package manager is detected
```

### EX12: no package.json

`jss-devtools init -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  no package.json here; to create a project: jss-devtools init <name>
```

### EX13: package.json is invalid JSON

`jss-devtools init -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  Unexpected end of JSON input
```

### EX14: package.json has workspaces

`jss-devtools init -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  monorepos are not supported yet
```

### EX15: pnpm-workspace.yaml with packages

`jss-devtools init -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  monorepos are not supported yet
```

### EX16: pnpm-workspace.yaml with settings only, 4-space indent

`jss-devtools init -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
│  + .husky/commit-msg
│  ~ pnpm-workspace.yaml
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
│  + .vscode/settings.json
… 17 lines …
+ @commitlint/cli 21.2.4
+ @commitlint/config-conventional 21.2.4
+ @eslint/js 10.0.1
+ @types/node 24.19.2 (26.6.5 is available)
+ eslint 10.13.0
+ eslint-config-prettier 10.1.8
+ eslint-plugin-autofix 2.2.0
+ eslint-plugin-import-x 4.17.1
+ eslint-plugin-prefer-arrow-functions 3.10.2
+ eslint-plugin-prettier 5.5.7
+ globals 17.13.0
+ husky 9.1.7
+ lint-staged 17.6.0
+ prettier 3.9.10
+ prettier-package-json 2.8.0
+ tsc-alias 1.9.9
+ tsx 4.23.15
+ typescript-eslint 8.72.1
Done in 2.2s using pnpm v11.24.0
└  done
```

stderr:

```text
(empty)
```

### EX17: pnpm-workspace.yaml with pnpm placeholders

`jss-devtools init -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
│  + .husky/commit-msg
│  ~ pnpm-workspace.yaml
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
│  + .vscode/settings.json
… 17 lines …
+ @commitlint/cli 21.2.4
+ @commitlint/config-conventional 21.2.4
+ @eslint/js 10.0.1
+ @types/node 24.19.2 (26.6.5 is available)
+ eslint 10.13.0
+ eslint-config-prettier 10.1.8
+ eslint-plugin-autofix 2.2.0
+ eslint-plugin-import-x 4.17.1
+ eslint-plugin-prefer-arrow-functions 3.10.2
+ eslint-plugin-prettier 5.5.7
+ globals 17.13.0
+ husky 9.1.7
+ lint-staged 17.6.0
+ prettier 3.9.10
+ prettier-package-json 2.8.0
+ tsc-alias 1.9.9
+ tsx 4.23.15
+ typescript-eslint 8.72.1
Done in 2.5s using pnpm v11.24.0
└  done
```

stderr:

```text
(empty)
```

### EX18: pnpm-workspace.yaml flow style

`jss-devtools init -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  pnpm-workspace.yaml cannot be extended line by line; add these entries by hand: allowBuilds.esbuild: true, allowBuilds.unrs-resolver: true
```

### EX19: no tsconfig.json

`jss-devtools init -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  no tsconfig.json here; init sets up TypeScript projects. To create one: jss-devtools init <name>
```

### EX20: not a git repository

`jss-devtools init -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  not a git repository; run git init first
```

### EX21: subfolder of a git repository

`jss-devtools init -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  the git root is ..; run jss-devtools init there
```

### EX22: core.hooksPath=.githooks

`jss-devtools init -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  git hooks are managed by .githooks (core.hooksPath); remove it with git config --unset core.hooksPath to use husky
```

### EX23: core.hooksPath=.husky (husky 4 style)

`jss-devtools init -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
│  + .vscode/settings.json
│  + .vscode/extensions.json
bun install v1.3.8 (b64edcb4)
+ @commitlint/cli@21.2.4
+ @commitlint/config-conventional@21.2.4
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript-eslint@8.72.1
+ typescript@6.0.3 (v7.0.2 available)
254 packages installed [390.00ms]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  done
```

stderr:

```text
Resolving dependencies
Resolved, downloaded and extracted [0]
Saved lockfile
$ husky
```

### EX24: packageManager yarn@4

`jss-devtools init -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  yarn@berry is not supported; supported: npm, yarn 1, pnpm, bun
```

### EX25: detected bun not installed

`jss-devtools init -y` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  bun is not installed; install it
```

### EX26: shared files merged (.gitignore, hook, user scripts)

`jss-devtools init -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  ~ .gitignore
│  + .prettierignore
│  ~ .husky/pre-commit
│  + .husky/commit-msg
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
│  + .vscode/settings.json
│  + .vscode/extensions.json
bun install v1.3.8 (b64edcb4)
+ @commitlint/cli@21.2.4
+ @commitlint/config-conventional@21.2.4
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript-eslint@8.72.1
+ typescript@6.0.3 (v7.0.2 available)
254 packages installed [374.00ms]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  done
```

stderr:

```text
Resolving dependencies
Resolved, downloaded and extracted [0]
Saved lockfile
$ husky
```

### EX27: install fails (registry unreachable)

`jss-devtools init -y` → exit 1

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
│  + .vscode/settings.json
│  + .vscode/extensions.json
```

stderr:

```text
npm error code ECONNREFUSED
npm error syscall connect
npm error errno ECONNREFUSED
npm error FetchError: request to http://127.0.0.1:9/@commitlint%2fcli failed, reason: connect ECONNREFUSED 127.0.0.1:9
npm error     at ClientRequest.<anonymous> (/Users/tandm/.nvm/versions/node/v24.11.0/lib/node_modules/npm/node_modules/minipass-fetch/lib/index.js:130:14)
npm error     at ClientRequest.emit (node:events:508:28)
npm error     at emitErrorEvent (node:_http_client:107:11)
npm error     at _destroy (node:_http_client:954:9)
npm error     at onSocketNT (node:_http_client:974:5)
npm error     at process.processTicksAndRejections (node:internal/process/task_queues:91:21) {
npm error   code: 'ECONNREFUSED',
npm error   errno: 'ECONNREFUSED',
npm error   syscall: 'connect',
npm error   address: '127.0.0.1',
npm error   port: 9,
npm error   type: 'system',
npm error   requiredBy: '.'
npm error }
npm error
npm error If you are behind a proxy, please make sure that the
npm error 'proxy' config is set properly.  See: 'npm help config'
npm error A complete log of this run can be found in: /Users/tandm/.npm/_logs/2026-10-27T18_01_59_986Z-debug-0.log
└  install failed; the files are written. To finish: npm install
```

### EX28: no -y, not a terminal

`jss-devtools init` → exit 1

stdout:

```text
┌   jss-devtools init
```

stderr:

```text
└  run it in a terminal, or pass --yes
```

### EX29: git worktree (.git is a file)

`jss-devtools init -y` → exit 0

stdout:

```text
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + commitlint.config.mjs
│  + .vscode/settings.json
│  + .vscode/extensions.json
bun install v1.3.8 (b64edcb4)
+ @commitlint/cli@21.2.4
+ @commitlint/config-conventional@21.2.4
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript-eslint@8.72.1
+ typescript@6.0.3 (v7.0.2 available)
254 packages installed [336.00ms]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  done
```

stderr:

```text
Resolving dependencies
Resolved, downloaded and extracted [0]
Saved lockfile
$ husky
```

### I1: pick pnpm with arrows, confirm Enter

`jss-devtools init my-app` → exit 0

stdout:

```text
spawn /Users/tandm/.nvm/versions/node/v24.11.0/bin/node /Users/tandm/Desktop/yyyy/dist/cli.mjs init my-app
     ██╗███████╗███████╗
     ██║██╔════╝██╔════╝   jss-devtools v0.0.1
     ██║███████╗███████╗   JavaScript stack dev tools CLI
██   ██║╚════██║╚════██║
╚█████╔╝███████║███████║   node v24.11.0 · macOS arm64
 ╚════╝ ╚══════╝╚══════╝
┌   jss-devtools init
◆  package manager
│  ● npm
│  ○ yarn
│  ○ pnpm
… 59 lines …
+ @commitlint/config-conventional 21.2.4
+ @eslint/js 10.0.1
+ @types/node 24.19.2 (26.6.5 is available)
+ eslint 10.13.0
+ eslint-config-prettier 10.1.8
+ eslint-plugin-autofix 2.2.0
+ eslint-plugin-import-x 4.17.1
+ eslint-plugin-prefer-arrow-functions 3.10.2
+ eslint-plugin-prettier 5.5.7
+ globals 17.13.0
+ husky 9.1.7
+ lint-staged 17.6.0
+ prettier 3.9.10
+ prettier-package-json 2.8.0
+ tsc-alias 1.9.9
+ tsx 4.23.15
+ typescript 6.0.3 (7.0.2 is available)
+ typescript-eslint 8.72.1
Done in 2.3s using pnpm v11.24.0
└  next: cd my-app, pnpm run dev
```


### I2: answer No at the confirm

`jss-devtools init my-app` → exit 1

stdout:

```text
spawn /Users/tandm/.nvm/versions/node/v24.11.0/bin/node /Users/tandm/Desktop/yyyy/dist/cli.mjs init my-app
     ██╗███████╗███████╗
     ██║██╔════╝██╔════╝   jss-devtools v0.0.1
     ██║███████╗███████╗   JavaScript stack dev tools CLI
██   ██║╚════██║╚════██║
╚█████╔╝███████║███████║   node v24.11.0 · macOS arm64
 ╚════╝ ╚══════╝╚══════╝
┌   jss-devtools init
◆  package manager
│  ● npm
│  ○ yarn
│  ○ pnpm
│  ○ bun
│  ↑/↓ to navigate • Enter: confirm
└
◇  package manager
│  npm
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + .vscode/settings.json
│  + .vscode/extensions.json
◆  write 13 files to my-app and install?
│  ● Yes / ○ No
└
│  ○ Yes / ● No◇  write 13 files to my-app and install?
│  No
└  cancelled, nothing written
```


### I3: Ctrl+C at the package manager question

`jss-devtools init my-app` → exit 1

stdout:

```text
spawn /Users/tandm/.nvm/versions/node/v24.11.0/bin/node /Users/tandm/Desktop/yyyy/dist/cli.mjs init my-app
     ██╗███████╗███████╗
     ██║██╔════╝██╔════╝   jss-devtools v0.0.1
     ██║███████╗███████╗   JavaScript stack dev tools CLI
██   ██║╚════██║╚════██║
╚█████╔╝███████║███████║   node v24.11.0 · macOS arm64
 ╚════╝ ╚══════╝╚══════╝
┌   jss-devtools init
◆  package manager
│  ● npm
│  ○ yarn
│  ○ pnpm
│  ○ bun
│  ↑/↓ to navigate • Enter: confirm
└
■  package manager
│  npm
└  cancelled, nothing written
```


### I4: Ctrl+C at the confirm

`jss-devtools init my-app` → exit 1

stdout:

```text
spawn /Users/tandm/.nvm/versions/node/v24.11.0/bin/node /Users/tandm/Desktop/yyyy/dist/cli.mjs init my-app
     ██╗███████╗███████╗
     ██║██╔════╝██╔════╝   jss-devtools v0.0.1
     ██║███████╗███████╗   JavaScript stack dev tools CLI
██   ██║╚════██║╚════██║
╚█████╔╝███████║███████║   node v24.11.0 · macOS arm64
 ╚════╝ ╚══════╝╚══════╝
┌   jss-devtools init
◆  package manager
│  ● npm
│  ○ yarn
│  ○ pnpm
│  ○ bun
│  ↑/↓ to navigate • Enter: confirm
└
◇  package manager
│  npm
│  + package.json
│  + tsconfig.json
│  + src/main.ts
│  + eslint.config.mjs
│  + .prettierrc.json
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + commitlint.config.mjs
│  + .husky/pre-commit
│  + .husky/commit-msg
│  + .vscode/settings.json
│  + .vscode/extensions.json
◆  write 13 files to my-app and install?
│  ● Yes / ○ No
└
■  write 13 files to my-app and install?
│  Yes
└  cancelled, nothing written
```


### I5: existing project, confirm Enter

`jss-devtools init` → exit 0

stdout:

```text
spawn /Users/tandm/.nvm/versions/node/v24.11.0/bin/node /Users/tandm/Desktop/yyyy/dist/cli.mjs init
     ██╗███████╗███████╗
     ██║██╔════╝██╔════╝   jss-devtools v0.0.1
     ██║███████╗███████╗   JavaScript stack dev tools CLI
██   ██║╚════██║╚════██║
╚█████╔╝███████║███████║   node v24.11.0 · macOS arm64
 ╚════╝ ╚══════╝╚══════╝
┌   jss-devtools init
│  ~ package.json
│  + .gitignore
│  + .prettierignore
│  + .husky/pre-commit
… 17 lines …
+ @eslint/js@10.0.1
+ @types/node@24.19.2 (v26.6.5 available)
+ eslint@10.13.0
+ eslint-config-prettier@10.1.8
+ eslint-plugin-autofix@2.2.0
+ eslint-plugin-import-x@4.17.1
+ eslint-plugin-prefer-arrow-functions@3.10.2
+ eslint-plugin-prettier@5.5.7
+ globals@17.13.0
+ husky@9.1.7
+ lint-staged@17.6.0
+ prettier@3.9.10
+ prettier-package-json@2.8.0
+ tsc-alias@1.9.9
+ tsx@4.23.15
+ typescript-eslint@8.72.1
+ typescript@6.0.3 (v7.0.2 available)
254 packages installed [1.56s]
Blocked 1 postinstall. Run `bun pm untrusted` for details.
└  done
```


### I6: help in a terminal

`jss-devtools init --help` → exit 0

stdout:

```text
spawn /Users/tandm/.nvm/versions/node/v24.11.0/bin/node /Users/tandm/Desktop/yyyy/dist/cli.mjs init --help
     ██╗███████╗███████╗
     ██║██╔════╝██╔════╝   jss-devtools v0.0.1
     ██║███████╗███████╗   JavaScript stack dev tools CLI
██   ██║╚════██║╚════██║
╚█████╔╝███████║███████║   node v24.11.0 · macOS arm64
 ╚════╝ ╚══════╝╚══════╝
Usage: jss-devtools init [options] [dir]
create a project, or set up the current one
Arguments:
  dir                 create a new project in this folder (missing or empty); without it, set up the project in the current folder
Options:
  --framework <name>  the preset to apply; only node is built so far (choices: "node", "react", "rn", "next", "nest", default: "node")
  --pm <name>         package manager for a new project; asked when omitted, npm with --yes. Not accepted without <dir>: the current folder's manager is detected (choices: "npm", "yarn", "pnpm", "bun")
  -f, --force         replace the config files init owns when they already exist, and delete their other names (default: off; init stops and lists them)
  --no-vscode         do not write .vscode/ (default: written)
  -y, --yes           do not ask; take the default answers (default: off; ask in a terminal)
  --dry-run           show the files that would change, write and install nothing (default: off)
  -h, --help          display help for command
Examples:
  $ jss-devtools init my-app              create my-app, asking for the package manager
  $ jss-devtools init my-app --pm pnpm -y create my-app with pnpm, no questions (CI)
  $ jss-devtools init                     set up the project in the current folder
  $ jss-devtools init --dry-run           show what would change, write nothing
  $ jss-devtools init -f                  replace existing ESLint, Prettier and commitlint configs
```

