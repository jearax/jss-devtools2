# Review: phase 0 + toolchain alignment (HEAD 173b5c0)

Scope: 18 commits trên `main`, plans `261019-1055-phase-0-source-foundation` và `261019-0625-toolchain-alignment`, toàn bộ `src/`, `tests/`, config, docs. Mọi kết luận dưới đây đã được tái hiện trên clean clone (`git clone` vào scratchpad), không dựa vào journal.

## Kết quả gate

- Clean clone, Node 24.21.0: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build` xanh, 3 file test, 14 test.
- CI `jearax/jss-devtools2` (public): 3 run gần nhất `completed success`, gồm `173b5c0`.
- Docs: không có link tương đối hỏng; dòng "TODO" duy nhất là chữ trong bảng quy tắc của `docs/code-standards.md:131`, không phải marker.
- Acceptance "unknown command kèm suggestion" chưa đạt và journal đã ghi rõ lý do (commander 15 chỉ gợi ý khi đã có subcommand). Chấp nhận được.

## Findings (nặng trước)

### 1. Critical: chạy CLI qua symlink thì không làm gì cả và exit 0

`src/cli.ts:82-94`. `isDirectRun()` so `process.argv[1]` với `import.meta.filename`. Khi chạy qua symlink, `argv[1]` là đường dẫn symlink còn `import.meta.filename` là realpath, nên guard trả `false` và `main()` không bao giờ chạy.

Tái hiện: `ln -s dist/cli.mjs bin/jss-devtools`. Khi đó `bin/jss-devtools --version` không in gì và exit 0, `bin/jss-devtools nope` cũng không in gì và exit 0.

Symlink chính là cách bin shim của pnpm/npm và hầu hết installer kiểu `curl | sh` cài CLI vào `PATH`. Vậy đây đúng là lớp lỗi "crash thành exit 0" mà rewrite này được dựng lên để chặn. `tests/bundle.test.ts` không bắt được vì nó chạy `node cli.mjs` trực tiếp.

Fix tối thiểu là so realpath, kèm một test chạy qua symlink:

```ts
import { realpathSync } from 'node:fs';

const isDirectRun = (): boolean => {
	const entry = process.argv[1];

	if (!entry) {
		return false;
	}

	try {
		return realpathSync(entry) === import.meta.filename;
	} catch {
		return false;
	}
};
```

```ts
it('runs through a symlink, the way bin shims and installers link it', async () => {
	await symlink(resolve(sandbox, 'cli.mjs'), resolve(sandbox, 'jss-devtools'));
	const { stdout } = await run(process.execPath, ['jss-devtools', '--version'], { cwd: sandbox });

	expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
});
```

Phương án bền hơn là bỏ hẳn guard: tách `createProgram`, `main` và `reportFatalError` sang module riêng, để `src/cli.ts` chỉ còn `await main()`. Không còn nhánh "im lặng" nào để sai nữa, nhưng phải chỉnh allow-list của architecture rule.

### 2. High: không thể viết type-only import nào qua được cả lint lẫn typecheck

`eslint.config.mjs:108` đặt `consistent-type-imports` với `prefer: 'no-type-imports'`, trong khi `tsconfig.json:17` bật `verbatimModuleSyntax: true`.

- Viết `import type { OptionValues } from 'commander'` thì ESLint báo "Use an `import` instead of an `import type`".
- Viết `import { OptionValues } from 'commander'` thì tsc báo TS1484 "must be imported using a type-only import when 'verbatimModuleSyntax' is enabled".

Hiện chưa lộ ra vì `src/` mới import class `Command` (là value). Import type đầu tiên ở plan core module sẽ bị chặn, và `eslint --fix` trong pre-commit còn tự đổi code sang dạng mà tsc từ chối.

Fix: `['error', { prefer: 'type-imports' }]`. Có khả năng rule này chép từ design-system, repo đó dùng `moduleResolution: Bundler` và có thể không bật `verbatimModuleSyntax`.

### 3. Medium: lint-staged có glob chồng nhau, nhiều tác vụ ghi cùng một file song song

`package.json:64-79`. Theo lint-staged README: glob không chứa `/` sẽ bật `matchBase`, nên `"*.{cjs,…,tsx}"` khớp mọi file code ở mọi thư mục.

- **Hai chuỗi ghi cùng lúc trên một file.** Mỗi file trong `src/` khớp cả glob thư mục lẫn glob root. Lint-staged chạy các glob song song, nên hai chuỗi `eslint --fix` → `prettier --write` cùng ghi lên một file. README gọi đúng tình huống này là race condition.
- **Allow-list thư mục bị vô hiệu hóa.** Một file trong `scratch/` cũng khớp glob root và vẫn bị lint lúc commit.
- **`package.json` có hai formatter ghi song song.** File này khớp cả `**/*.{json,…}` (prettier) lẫn `package.json` (`prettier-package-json`).
- **Gọi một package không pin, lấy qua mạng lúc commit.** `pnpm dlx prettier-package-json@^2.8.0` dùng range, trái quy tắc "Pin what you install" trong CLAUDE.md.

### 4. Medium: glob nguồn bị chép 4 nơi dù ESLint chỉ cần một nơi, và docs nói sai về typecheck

- **ESLint không cần glob trong script.** `eslint .` lint đúng 13 file mà glob trong script đang lint (đã so bằng `--debug`, `diff` ra rỗng). Lý do: flat config tự chọn file theo `files`. Vì vậy glob trong `lint`, `lint:fix` và `lint-staged` là bản sao thừa của một fact. Đây là vi phạm trực tiếp quy tắc "One fact, one home", và cũng giải thích vì sao có 6 commit refactor chỉ để chỉnh hình dạng glob.
- **Docs sai về typecheck.** `docs/code-standards.md` ghi "a file outside them is never linted or type-checked". Nhưng `tsconfig.json` dùng `include: ["**/*"]`, và thực nghiệm cho thấy `scratch/x.ts` có lỗi kiểu làm `pnpm typecheck` fail.

Đề xuất (giữ nguyên ý định allow-list của bạn, chỉ gom về một chỗ là `eslint.config.mjs`):

```json
"lint": "eslint .",
"lint:fix": "eslint . --fix",
"lint-staged": {
	"*.{cjs,mjs,js,jsx,cts,mts,ts,tsx}": "eslint --fix --no-warn-ignored",
	"*.{json,md,yml,yaml}": "prettier --write"
}
```

- `--no-warn-ignored` để lint-staged truyền file nằm ngoài allow-list vào mà không sinh warning.
- `prettier --write` sau `eslint --fix` là thừa, vì `prettier/prettier` đã là một ESLint rule.
- Phần typecheck: hoặc thu hẹp `include` cho khớp với allow-list, hoặc sửa câu trong docs.

### 5. Medium: `TEST_FILES` trùng với `TYPESCRIPT_FILES`, nên rule của vitest áp lên `src/`

`eslint.config.mjs:21` và `:23` sinh ra cùng một pattern. Tái hiện: `src/leak.ts` chứa `it('x', () => {})` bị báo `vitest/expect-expect`.

Fix: `TEST_FILES` chỉ gồm các thư mục test (`test{,s}`, `__test{s,}__`, `spec{,s}`, `e2e`) cộng với `**/*.{test,spec}.*`.

### 6. Medium: `.gitignore` không chặn `.env.production`, `.env.staging`

`.gitignore:10-11` chỉ có `.env` và `.env.*.local`. Phase 1 đã yêu cầu `.env.*`, và global rule của bạn cấm commit dotenv. Design-system (`.env*.local`) cũng có lỗ hổng này, nên chép theo nó là chép luôn lỗ hổng.

Fix: thay bằng `.env*` cộng `!.env.example`. `.prettierignore` sửa tương tự.

### 7. Medium: floor 22.12 của consumer chưa từng được kiểm chứng

- **CI chỉ chạy patch mới nhất.** `pnpm/setup` với `node@22` lấy 22.x mới nhất, nên `engines.node >=22.12.0` không có job nào chạy thật trên 22.12. Không chạy được test suite trên 22.12, vì tsdown cần `^22.18` và devEngines cần `>=22.13`. Tuy vậy, chạy riêng `dist/cli.mjs` thì được: build trên 24 rồi `node@22.12.0 dist/cli.mjs --version`.
- **Kiểu của Node lệch với floor.** `@types/node` đang là `26.6.5`, nên tsc cho phép dùng API chỉ có trên Node 24 hoặc 26, và bundle sẽ vỡ ngay trên floor đã công bố. Pin `@types/node` ở `22.x` để kiểu khớp với floor.

### 8. Low

- **`.editorconfig` lệch giá trị độ rộng tab.** `.editorconfig` đặt `tab_width = 4`, trong khi `.prettierrc.json` có `tabWidth: 2` và `.vscode/settings.json` có `editor.tabSize: 2`. Một fact có hai giá trị, nên editor hiển thị tab rộng 4 nhưng prettier tính `printWidth: 120` theo 2, và thước kẻ 120 sẽ lệch. Giá trị này chép từ design-system, tức là quyết định của bạn, nên mình hỏi chứ không sửa (xem câu hỏi bên dưới). Success criterion "agree with each other" của plan alignment hiện chưa đúng.
- **Decision 0006 còn câu cũ.** `docs/decisions/0006-consumer-node-floor.md:20-21` vẫn ghi "Development uses Node 24, which `devEngines.runtime` declares", trong khi giá trị hiện tại là `>=22.13.0`.
- **`minimumReleaseAgeExclude` sắp thành config chết.** `pnpm-workspace.yaml:6-12` liệt kê các bản commitlint 21.2.4, publish lúc 2026-10-18 12:52Z. Khi chúng đủ tuổi theo cửa sổ của pnpm, các dòng này không còn tác dụng; xóa ở lần bump kế tiếp.
- **`@clack/prompts` chưa được dùng.** Nó là dependency runtime nhưng không có chỗ nào import (theo quy tắc "Write what exists"). Có thể thêm lại khi có prompt đầu tiên.
- **`addUnknownCommandFallback` là code có hạn dùng.** Nó tự thành dead code ngay khi có command đầu tiên. Nên ghi vào phase đầu tiên của plan core module để xóa nó.
- **Name và description bị chép hai nơi.** `'JavaScript stack dev tools CLI'` và `'jss-devtools'` nằm ở cả `package.json` lẫn `src/cli.ts:6-10`, trong khi version lại được inject. Có thể inject chung với version hoặc chấp nhận; mức độ nhẹ.

## Ghi nhận tốt

- **Exit code đúng.** `CommanderError.exitCode` được tôn trọng trong `main()`, nên `--help`/`--version` vẫn exit 0 dù có catch ở top-level.
- **Architecture test có fixture âm cho từng rule,** cộng thêm test "mỗi rule một fixture".
- **Bundle test chạy từ temp dir của OS,** không thể resolve ngược lên `node_modules` của repo.
- **CI đúng pattern đã chọn:** pin action bằng SHA, `persist-credentials: false`, `contents: read`.
- **Journal trung thực,** ghi cả lỗi `rm -rf tests` lẫn chẩn đoán sai về glob.

## Câu hỏi chưa giải quyết

1. `tab_width = 4` trong `.editorconfig` là chủ ý của design-system (đọc code rộng hơn) hay là lỗi được chép theo? Mình nghiêng về `2` để khớp với prettier và VS Code.
2. Finding 1: sửa tối thiểu (`realpathSync`) hay tách entry? Mình nghiêng về sửa tối thiểu cộng test symlink ngay bây giờ; việc tách module để sang plan core module, nơi layout được quyết định.
3. Finding 4: có đồng ý chuyển sang `eslint .` để allow-list chỉ còn nằm trong `eslint.config.mjs` không? Thay đổi này đảo ngược một phần chuỗi refactor glob mà bạn đã duyệt.
