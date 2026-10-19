---
id: 0017
title: Formatting facts shared by Prettier and editors live only in .editorconfig
status: accepted
date: 2026-10-19
---

# 0017 Formatting facts shared by Prettier and editors live only in .editorconfig

## Context

Decision 0014 copied the reference's formatting settings into `.prettierrc.json`, `.editorconfig`
and `.vscode/settings.json`, so the same facts were written in up to three files, and some did not
agree:

| Fact                | Was stated in                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Indentation         | `.editorconfig` `tab_width = 4`; Prettier `tabWidth: 2`; VS Code `editor.tabSize: 2`               |
| Line width          | Prettier `printWidth`, `.editorconfig` `max_line_length`, VS Code `editor.rulers`                  |
| Line endings        | Prettier `endOfLine: auto` (keep what is on disk); VS Code `files.eol: auto` (the OS line ending)  |
| Final newline       | `.editorconfig` `insert_final_newline`, VS Code `files.insertFinalNewline`                         |
| Trailing whitespace | `.editorconfig` `trim_trailing_whitespace` and its Markdown override, VS Code the same twice again |

The two `auto` values look alike but mean different things, so they never agreed. Every tracked file
is LF (`git ls-files --eol`).

Prettier reads `.editorconfig` by default and maps `indent_style`, `indent_size`/`tab_width`,
`max_line_length` and `end_of_line` onto its own options. The EditorConfig extension that
`.vscode/extensions.json` recommends applies `indent_style`, `indent_size`, `tab_width`, `charset`,
`end_of_line`, `insert_final_newline` and `trim_trailing_whitespace` in VS Code. So one file can feed
both readers.

## Decision

`.editorconfig` is the only home for every fact Prettier and the editor share: charset, line ending
(`lf`), indentation (tabs, `indent_size = 2`, `tab_width` defaulting to it), line width (120), final
newline and trailing whitespace. YAML and Markdown indent with spaces, because YAML forbids tab
indentation, and Markdown keeps trailing whitespace, because two trailing spaces are a hard break.

`.prettierrc.json` holds only what Prettier alone decides: semicolons, quotes, arrow parentheses and
trailing commas. `.vscode/settings.json` holds only editor behaviour: the default formatter, format
and ESLint fix on save, the TypeScript SDK and the package manager. `prettier-package-json` runs
without `--use-tabs`; the Prettier step after it applies the indentation.

## In the user's words

> "tab width cần single trust source => delegate full for you." (user, 2026-10-19)

> "Chỗ tôi cần "single source trust" cho `prettierrc, VSCode settings, editorconfig` bạn làm chưa? Tôi
> thấy còn 1 vài chỗ hơn 2 source." (user, 2026-10-19)

> "IMHO, single source trust tuỳ thuộc vào .editorconfig là chính." (user, 2026-10-19)

## Consequences

- Verified with `prettier.resolveConfig(file, { editorconfig: true })`: TypeScript and JSON resolve to
  tabs, YAML and Markdown to spaces, all with `printWidth: 120` and `endOfLine: lf`. `pnpm lint`
  passes, so `eslint-plugin-prettier` reads the same values; `pnpm format:check` changes no file.
- Line endings change from "keep what is on disk" to LF. No file changes, because every tracked file
  is already LF.
- The 120 ruler in VS Code is gone. The EditorConfig extension does not support `max_line_length` and
  VS Code cannot read a ruler from `.editorconfig`, so keeping it meant a second copy of 120. Prettier
  still wraps at 120 on save.
- VS Code without the EditorConfig extension falls back to its own defaults while typing. Format on
  save still applies Prettier, so committed files stay correct either way.
