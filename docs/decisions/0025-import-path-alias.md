---
id: 0025
title: One import alias, @/, and no parent-relative imports
status: accepted
date: 2026-10-21
---

# 0025 One import alias, @/, and no parent-relative imports

## Context

The core layout put one folder per command under `src/commands/`, so a file in a check folder
reached a type file with `../types/doctor-check.type.js` and a file in the command root reached
`core/` with `../../core/...`. The depth of the path said nothing about the target, and a file
moved up a folder broke every specifier above it.

## Decision

One alias, `@/`, mapped to `src/` in `tsconfig.json`:

```json
"paths": {
	"@/*": ["./src/*"]
}
```

- An import that leaves its folder goes through `@/`; an import in the same folder stays `./`.
- A parent-relative `../` import is rejected by ESLint, so the alias is the only way up.
- Imports carry no file extension: `@/core/errors/cli.error` is the file
  `src/core/errors/cli.error.ts` ([0028](./0028-extensionless-imports.md)).
- The alias is declared once. TypeScript, tsdown and vitest read it from `tsconfig.json`; ESLint
  learns it through `import-x/internal-regex`, and the architecture scanner maps `@/x` to the
  logical path `x` so a rule sees an aliased import the same as a relative one.
- `tests/fixtures/**` keeps its relative imports: `@/` points at the real `src/`, where the fixture
  targets do not exist.

## In the user's words

> "lên plan sử dụng alias import thông qua `@/` và apply cho tất cả code hiện tại" (user,
> 2026-10-21)
>
> "Cấm `../`, giữ `./`" (user, 2026-10-21)

## Consequences

- A file can move without its importers changing: the specifier names the target, not the distance
  to it.
- The rules that match import text still match: `core-imports-no-command` sees `commands/` in
  `@/commands/...`, and `command-imports-no-other-command` resolves the alias before it decides.
- `tests/` has no alias of its own, so the test helpers are reached with `./support/...`.
- A tool that stops reading `paths` would leave `@/` in the bundle. The build fails at
  `UNRESOLVED_IMPORT` instead of warning, so the broken bundle never reaches the artifact, and the
  bundle suite, which runs `dist/cli.mjs` with no `node_modules`, is the second net.
