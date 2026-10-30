# Research: a more striking banner

2026-10-30, for the user's request: "Banner JSS, tôi thấy không bắt mắt, có libs/pkgs nào đẹp hơn
không, research thêm vấn đề này nha, kiểu kiểu như là lib `figlet` chẳng hạn."

## Finding

The banner already is figlet output: `src/core/constants/banner.constant.ts` holds `JSS` in figlet's
"ANSI Shadow" font, rendered once and stored as a constant, because the bundle ships without
`node_modules`. What makes it plain is the colouring, one 16-colour ANSI colour per row (cyan, cyan,
blue, blue, magenta, magenta), and to a lesser degree the font. Another library does not change that
by itself.

## Libraries (npm registry, 2026-10-30)

| Package | Version | Last publish | Unpacked | Dependencies | Fit |
|---|---|---|---|---|---|
| `figlet` | 1.12.0 | 2026-09-27 | 18,486 KB | commander | Fonts only. 18 MB of fonts; runtime use would bloat the single-file bundle. Use it once to render, as today |
| `cfonts` | 3.3.1 | 2025-09-05 | 324 KB | supports-color, window-size | Own fonts plus built-in gradients; a runtime dependency for one banner |
| `oh-my-logo` | 0.5.0 | 2026-05-19 | 66 KB | cfonts, figlet, gradient-string, ink, react | A CLI that combines the above; pulls ink and React |
| `gradient-string` | 3.0.0 | 2024-09-27 | 18 KB | chalk, tinygradient | Gradient only; adds chalk next to `styleText` |
| `ink-gradient`, `ink-big-text` | 4.0.1, 2.0.0 | 2026-05-29, 2023-04-05 | 11 KB, 5 KB | ink, gradient-string, cfonts | Need the ink React renderer this CLI does not use |

## Recommendation

Keep figlet as a render-once tool and add no runtime dependency. Pick the font from rendered samples,
store it as today, and colour it with a horizontal truecolor gradient: a function of about twenty
lines over `\x1b[38;2;r;g;bm`, with the shading characters of the font dimmed. The gradient falls
back by `process.stdout.getColorDepth()` (truecolor, 256, 16 colours), and the banner stays off when
the output is not a terminal, as today, so `NO_COLOR` and piped output are unaffected.

Preview script (run in a terminal):
`node /private/tmp/claude-501/-Users-tandm-Desktop-yyyy/97bd11d1-32de-4919-ad10-9f1ccf87d1bf/scratchpad/banner/preview.mjs`.
It prints eight candidates: today's banner, ANSI Shadow with two gradients, DOS Rebel, Delta Corps
Priest 1, ANSI Regular, and two compact fonts (Calvin S, Rubifont).

## Unresolved questions

- Which font and which palette: the user's choice from the preview.
