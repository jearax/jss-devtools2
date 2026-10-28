# Task: VS Code auto-import writes the `@/` form

For the cooker, 2026-10-28. Decided by the user (decision log, "Import paths in VS Code").

## Change

Add two lines, right after `"js/ts.tsdk.promptToUseWorkspaceVersion": true,`, in both files:

```json
"js/ts.preferences.importModuleSpecifier": "non-relative",
"js/ts.preferences.importModuleSpecifierEnding": "minimal",
```

- `.vscode/settings.json` (this repository)
- `src/commands/init/templates/vscode-settings-json.template.ts` (what init writes)

The ESLint rule `no-restricted-imports`, in `eslint.config.mjs` and in the init ESLint template, stays
exactly as it is.

## Tests and docs

- Update the template snapshot (`tests/__snapshots__/node-preset-templates.test.ts.snap`) and any test
  that asserts the settings file's lines.
- Update any doc that lists the settings init writes (grep `docs`, `README.md` for
  `promptToUseWorkspaceVersion` or `.vscode/settings.json`); no new doc text otherwise.

## Comments

Default zero comments; none expected here. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. No commit; reply with the
Status block, a short summary and the files changed.
