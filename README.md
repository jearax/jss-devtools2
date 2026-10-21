# jss-devtools

A rewrite of `@jjuidev/jss-devtools`: a command-line tool for JavaScript-stack repositories.

This repository is at its foundation stage. The CLI exists and is tested, `jss-devtools doctor` is
its first command and `jss-devtools init` its second. See
[docs/project-roadmap.md](./docs/project-roadmap.md) for what comes next and
[docs/system-architecture.md](./docs/system-architecture.md) for how the current code is put together.

## Requirements

Node >=24.11.0 (`engines.node`) both to develop this repo and to run the CLI, plus pnpm 11.24.0 to
develop. It is the first release of the Node 24 LTS line, and every pinned package accepts it, so
pnpm refuses an older Node at install (`engineStrict`). CI runs exactly this version and no other
([decision 0026](./docs/decisions/0026-node-floor-24.md)).

pnpm is pinned through `packageManager`, so `corepack` selects the right version. There is no
`.npmrc` and no `.nvmrc`: pnpm reads its settings from `pnpm-workspace.yaml`, and the development
runtime is declared once in `package.json`.

## What the CLI does today

```bash
node dist/cli.mjs --help      # usage
node dist/cli.mjs -v          # the version from package.json (also --version)
node dist/cli.mjs doctor      # check the environment, exit 1 with a fix hint when a check fails
node dist/cli.mjs init        # set up a project; the scaffold writes nothing yet
node dist/cli.mjs nope        # error plus help, exit code 1
```

The built CLI is a single self-contained file: it bundles its runtime dependencies and runs with no
`node_modules` beside it.

## Install

```bash
curl -fsSL https://jss-devtools.jjuidev.com/install.sh | sh
```

The installer needs Node >=24.11.0 and `curl` or `wget`. It writes the CLI to
`~/.jss-devtools/<version>/cli.mjs` and the `jss-devtools` command to `~/.local/bin/jss-devtools`,
and prints a `PATH` hint when that directory is not on your `PATH`. `JSS_DEVTOOLS_BASE_URL`,
`JSS_DEVTOOLS_HOME` and `JSS_DEVTOOLS_BIN_DIR` move those locations.

The site's home page is `https://jss-devtools.jjuidev.com/`. How it is deployed, and how to roll it
back, is in [docs/deployment-guide.md](./docs/deployment-guide.md).

After the install, `jss-devtools doctor` checks the environment: the Node version against the floor,
whether git is installed, and whether the working directory is inside a repository. Each check that
fails carries the fix, and the command exits 1.

`jss-devtools init` sets up a project. What ships today is its scaffold: the command, the shared
`-y, --yes` and `--dry-run` flags, and the help with its examples. It writes nothing yet: every run
ends with "Nothing to set up". The flow that fills it is being worked out
([decision log](./plans/261022-0141-init-flow-discussion/decision-log.md)).

## Development

```bash
pnpm install
pnpm build        # bundle src/cli.ts into dist/cli.mjs
pnpm lint         # ESLint, including formatting
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest (builds the bundle first, then runs every check)
pnpm format       # eslint --fix, then prettier --write
pnpm format:check # prettier --check, reporting only
pnpm stage:release # stage dist/cli.mjs into release/ for the site image
```

Run the four checks in that order before claiming a change is done. `pnpm test` builds the CLI
itself, so a green test run also proves the build works. `pnpm lint` runs Prettier as an ESLint rule,
so a green lint already means the formatting is right.

`pnpm stage:release` writes `release/cli.mjs` and `release/checksums.txt`, the two files the site
image carries. The directory is git-ignored and exists only between staging and the image build.

Editor settings for VS Code live in `.vscode/`. Every formatting fact Prettier and the editor share
(charset, line endings, indentation, width, final newline, trailing whitespace) is declared once, in
`.editorconfig`; install the recommended EditorConfig extension so VS Code applies it while you
type. `.prettierrc.json` holds only the settings Prettier alone decides.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) and are checked
by a git hook. The repository history is a single line on `main`; push with
`git push -u origin main`. A green push to `main` deploys the site, so read
[docs/deployment-guide.md](./docs/deployment-guide.md) before you push.

## License

MIT. See [LICENSE](./LICENSE).
