# Init flow discussion: decision log

Started 2026-10-22. Diagram: [init-flow.html](./init-flow.html), source
[init-flow.diagram.json](./init-flow.diagram.json). Earlier flow and D/T table:
[planner-261021-1637-init-command-workflow.md](../reports/planner-261021-1637-init-command-workflow.md).

Each entry is decided by the user and quotes them. Anything not listed here is still open.

## How the work is ordered

> "trước tiên, cũng scaffold command init structure trước nè, rồi xác định các flags phụ trước (tức là
> case dễ xử lý trước, case khó cùng khảo luận, ví dụ: -y|--yes, --no-*, --json để dùng với | jq,
> dry, --help,....)" (user, 2026-10-22)

- P1: the auxiliary flags, one at a time, into a contract table.
- P2: the `init` folder structure, wired with the P1 flags, running end to end on an empty preset.
- P3: the hard cases, discussed together: T2, preflight, preset, `package.json` changes, conflicts,
  failure half way.

## The main use case

> "Usecase chính của CLI này chủ yếu là init repo, kiểu như vite create á." (user, 2026-10-22)

T2 is answered: both, with a rank.

> "Usecase có 2 trường hợp chính: Init từ đầu luôn là usecase chính. Init vào repo đã có sẵn là
> usecase phụ (tôi đang nghĩ sẽ dựa vào entrypoint là file package.json á, không biết ổn không)"
> (user, 2026-10-22)

- Primary: create a project from nothing, the way create-vite does.
- Secondary: set up an existing repository.
- Proposed by the user, under discussion: `package.json` in the target folder decides which of the two
  runs. The edge cases are being decided one at a time below.
- The flow diagram is redrawn once the cases are settled ("bạn vẽ lại flow sau khi chốt cho trực
  quan nhé").

## Flags in the first batch

> "Vậy tôi chốt làm trước các flag sau: -h|--help, --dry-run, -y|--yes, --json" (user, 2026-10-22)

| Flag | Contract | Status |
|---|---|---|
| `-h, --help` | Commander's usage and options, plus an `Examples` section added with `addHelpText('after')`: plain, `--dry-run`, `--yes` (CI). Exit 0. Banner only on a terminal, from the root's `beforeAll`. "a, có Examples" (user, 2026-10-22) | decided |
| `--dry-run` | Runs preflight (read-only): a failed check exits 1 as a real run would. Shows `+` new and `~` changed files, then "Dry run: N files would be written". Never asks, never writes: no file, no install, no hooks, no manifest; the flow branches off once, after the preview and before the confirmation. With `--yes` it still writes nothing and is not an error. Always exit 0 when the plan is shown, changes or not. A `--check`-style opt-in exit code waits for a real use case (UC4, P3). "a, luôn exit 0." (user, 2026-10-22); the behavior table was put with the question and drew no objection | decided |
| `-y, --yes` | Never asks any question; every question takes its default, for CI/CD. Each question's default is designed with that question, not here: `-y` does not mean "answer yes". Without `-y`: a terminal asks; no terminal on stdin or stdout, or `CI` set, exits 1 with "run it in a terminal, or pass --yes". Help line: `do not ask; take the default answers`. "Đối với tôi, -y nghĩa là không hỏi bất kỳ câu hỏi nào, lấy giá trị default, dùng để support CI/CD á" / "Không phải có -y thì các câu hỏi default là yes. -y là của chung toàn command, các giá trị default thì tuỳ vào cách mình gán cho hợp lý, thiết kế sau." (user, 2026-10-22). "Toàn command" was clarified as: declared once, attached by every command that asks; see below | decided |
| `--json` | Dropped, with everything tied to it: no JSON output, no `--help` example, no stream split. "Bỏ hết mọi thứ liên quan --json, vì usecase k thực tế." (user, 2026-10-22). Closes T4 | dropped |

## Where the shared flags are declared

`-y, --yes` and `--dry-run` are declared once in `src/core/` as plain data (flags and description),
and every command that asks a question attaches them in its `*.command.ts`; `doctor` asks nothing and
has neither. Core holds no commander import, per the `commander-in-command-files-only` rule.
"Khai báo 1 lần, command nào cần thì gắn" (user, 2026-10-22, chosen option).

## Declining the confirmation (D4, part)

No, or Ctrl+C, at the confirmation exits 1 with "cancelled, nothing written" on stderr. "exit 1"
(user, 2026-10-22, chosen option).

Not in the first batch: `--no-install`, `--no-hooks` (each lands with the stage it turns off),
`[dir]` / `--cwd`, `--force`, `--framework` (P3).
