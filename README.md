# jss-devtools

A rewrite of `@jjuidev/jss-devtools`: a command-line tool for JavaScript-stack repositories.

This repository is at its foundation stage. The CLI exists and is tested; no product command has
been built yet. See [docs/project-roadmap.md](./docs/project-roadmap.md) for what comes next and
[docs/system-architecture.md](./docs/system-architecture.md) for how the current code is put together.

## Requirements

| Purpose               | Version                                             |
| --------------------- | --------------------------------------------------- |
| Developing this repo  | Node >=22.13.0 (`devEngines.runtime`), pnpm 11.24.0 |
| Running the built CLI | Node >=22.12.0 (`engines.node`)                     |

The two floors differ because different packages set them: commander 15, the only runtime dependency
the CLI ships, needs 22.12, while ESLint 10 needs 22.13 to run the linter. `devEngines.runtime` uses
`onFail: error`, so pnpm enforces the development floor at install. The Node a CI job runs is stated
in the workflow instead, because a developer floor and a test target are different facts.

pnpm is pinned through `packageManager`, so `corepack` selects the right version. There is no
`.npmrc` and no `.nvmrc`: pnpm reads its settings from `pnpm-workspace.yaml`, and the development
runtime is declared once in `package.json`.

## What the CLI does today

```bash
node dist/cli.mjs --help      # usage
node dist/cli.mjs --version   # the version from package.json
node dist/cli.mjs nope        # error plus help, exit code 1
```

The built CLI is a single self-contained file: it bundles its runtime dependencies and runs with no
`node_modules` beside it.

## Development

```bash
pnpm install
pnpm build        # bundle src/cli.ts into dist/cli.mjs
pnpm lint         # ESLint, including formatting
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest (builds the bundle first, then runs every check)
pnpm format       # eslint --fix, then prettier --write
pnpm format:check # prettier --check, reporting only
```

Run the four checks in that order before claiming a change is done. `pnpm test` builds the CLI
itself, so a green test run also proves the build works. `pnpm lint` runs Prettier as an ESLint rule,
so a green lint already means the formatting is right.

Editor settings for VS Code live in `.vscode/`. Every formatting fact Prettier and the editor share
(charset, line endings, indentation, width, final newline, trailing whitespace) is declared once, in
`.editorconfig`; install the recommended EditorConfig extension so VS Code applies it while you
type. `.prettierrc.json` holds only the settings Prettier alone decides.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) and are checked
by a git hook. The repository history is a single line on `main`; push with
`git push -u origin main`.

## License

MIT. See [LICENSE](./LICENSE).
