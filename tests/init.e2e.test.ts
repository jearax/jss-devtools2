import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { afterAll, describe, expect, it } from 'vitest';

// Needs the network for the installs and every manager on PATH, so it stays out of the default
// `pnpm test`: run it alone with `INIT_E2E=1 pnpm vitest run tests/init.e2e.test.ts` after a build
// (the vitest globalSetup builds the bundle when it is missing).
const enabled = process.env['INIT_E2E'] === '1';

const CLI = resolve(import.meta.dirname, '../dist/cli.mjs');

const MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const;

type Manager = (typeof MANAGERS)[number];

const TIMEOUT = 10 * 60 * 1000;

const run = promisify(execFile);

const available = async (pm: Manager): Promise<boolean> => {
	try {
		await run(pm, ['--version']);

		return true;
	} catch {
		return false;
	}
};

const gitOut = (cwd: string, args: readonly string[]): Promise<string> => {
	return run('git', args, { cwd }).then((result) => {
		return result.stdout.trim();
	});
};

const DECIDED_FILES = [
	'.editorconfig',
	'.gitignore',
	'.husky/commit-msg',
	'.husky/pre-commit',
	'.prettierignore',
	'.prettierrc.json',
	'.vscode/extensions.json',
	'.vscode/settings.json',
	'commitlint.config.mjs',
	'eslint.config.mjs',
	'package.json',
	'src/main.ts',
	'tsconfig.json'
];

const LOCKFILES: Record<Manager, string> = {
	bun: 'bun.lock',
	npm: 'package-lock.json',
	pnpm: 'pnpm-lock.yaml',
	yarn: 'yarn.lock'
};

// husky writes its shim folder on install and the manager writes its lockfile; init writes the rest.
const listInitFiles = (project: string, pm: Manager): readonly string[] => {
	const files: string[] = [];

	const walk = (dir: string, name: string): void => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') {
				continue;
			}

			const relative = name === '' ? entry.name : `${name}/${entry.name}`;

			if (entry.isDirectory()) {
				walk(join(dir, entry.name), relative);
			} else {
				files.push(relative);
			}
		}
	};

	walk(project, '');

	return files
		.filter((file) => {
			return !file.startsWith('.husky/_') && file !== LOCKFILES[pm];
		})
		.sort();
};

const root = await mkdtemp(join(tmpdir(), 'jss-init-e2e-'));

const folders: string[] = [root];

afterAll(async () => {
	for (const dir of folders.splice(0)) {
		await rm(dir, {
			recursive: true,
			force: true
		});
	}
});

describe.runIf(enabled)('init end to end', () => {
	it.each(MANAGERS)(
		'creates a %s project that lints, typechecks, builds and runs',
		async (pm: Manager) => {
			if (!(await available(pm))) {
				if (pm === 'npm' || pm === 'pnpm') {
					throw new Error(`${pm} is required but not on PATH`);
				}

				console.log(`[init e2e] ${pm}: skipped, not on PATH`);

				return;
			}

			const started = Date.now();
			const project = join(root, `my-app-${pm}`);

			await run('node', [CLI, 'init', `my-app-${pm}`, '--pm', pm, '-y'], {
				cwd: root,
				timeout: TIMEOUT
			});

			const src = readFileSync(join(project, 'src', 'main.ts'), 'utf8');
			const hello = /console\.log\('(.*)'\)/.exec(src)?.[1] ?? '';

			for (const script of ['lint', 'typecheck', 'build'] as const) {
				await run(pm, ['run', script], {
					cwd: project,
					timeout: TIMEOUT
				});
			}

			const main = await run('node', ['dist/main.js'], {
				cwd: project,
				timeout: 60_000
			});

			expect(main.stdout.trim()).toBe(hello);

			expect(await gitOut(project, ['config', 'core.hooksPath'])).toBe('.husky/_');
			expect(await gitOut(project, ['symbolic-ref', '--short', 'HEAD'])).toBe('main');

			const packageJsonPath = join(project, 'package.json');
			const before = readFileSync(packageJsonPath, 'utf8');
			const packageJson = JSON.parse(before) as { packageManager?: string };

			expect(packageJson['packageManager']).toContain(`${pm}@`);

			const bins = join(project, 'node_modules', '.bin');

			await run(join(bins, 'prettier-package-json'), ['--write', 'package.json'], {
				cwd: project,
				timeout: 60_000
			});
			await run(join(bins, 'prettier'), ['--write', 'package.json'], {
				cwd: project,
				timeout: 60_000
			});

			expect(readFileSync(packageJsonPath, 'utf8')).toBe(before);

			const decided = (pm === 'pnpm' ? [...DECIDED_FILES, 'pnpm-workspace.yaml'] : DECIDED_FILES).toSorted();

			expect(listInitFiles(project, pm)).toEqual(decided);

			console.log(`[init e2e] ${pm}: ${((Date.now() - started) / 1000).toFixed(1)}s`);
		},
		TIMEOUT
	);

	it(
		'sets up the project again in existing mode, stops on the second run, and replaces with -f',
		async () => {
			const source = join(root, 'my-app-pnpm');

			expect(existsSync(source), 'the pnpm create test should have left my-app-pnpm behind').toBe(true);

			const copy = join(root, 'existing-app');

			await cp(source, copy, { recursive: true });
			await rm(join(copy, 'node_modules'), {
				recursive: true,
				force: true
			});

			for (const owned of [
				'.vscode',
				'eslint.config.mjs',
				'.prettierrc.json',
				'.editorconfig',
				'commitlint.config.mjs'
			]) {
				rmSync(join(copy, owned), {
					recursive: true,
					force: true
				});
			}

			await run('node', [CLI, 'init', '-y'], {
				cwd: copy,
				timeout: TIMEOUT
			});

			expect(existsSync(join(copy, 'eslint.config.mjs'))).toBe(true);

			const workspace = readFileSync(join(copy, 'pnpm-workspace.yaml'), 'utf8');

			expect(workspace).toContain('esbuild: true');
			expect(workspace).toContain('unrs-resolver: true');

			const marker = join(copy, 'eslint.config.mjs');
			const before = readFileSync(marker, 'utf8');

			const again: { code?: number; stderr: string } = await run('node', [CLI, 'init', '-y'], {
				cwd: copy
			}).then(
				() => {
					return {
						code: 0,
						stderr: ''
					};
				},
				(error: unknown) => {
					return error as { code?: number; stderr: string };
				}
			);

			expect(again.code).toBe(1);
			expect(again.stderr).toContain('already exist');
			expect(readFileSync(marker, 'utf8')).toBe(before);

			await run('node', [CLI, 'init', '-f', '-y'], {
				cwd: copy,
				timeout: TIMEOUT
			});
		},
		TIMEOUT
	);
});
