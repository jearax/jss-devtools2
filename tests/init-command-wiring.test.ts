import { execFile } from 'node:child_process';
import { existsSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProgram, runProgram } from '@/cli';

import { capture } from './support/capture-stream';
import { makeEmptyDir } from './support/tmp-dir';

const calls = vi.hoisted(() => {
	return {
		install: [] as [string, string][],
		bins: [] as [string, string][],
		sortCode: '',
		confirms: 0,
		installCode: undefined as number | undefined
	};
});

vi.mock('@/core/adapters/package-manager.adapter', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();

	return {
		...actual,
		installPackages: (pm: string, cwd: string) => {
			calls.install.push([pm, cwd]);

			return Promise.resolve(calls.installCode ?? 1);
		},
		runLocalBin: (pm: string, bin: string) => {
			calls.bins.push([pm, bin]);

			return Promise.resolve({
				code: bin === calls.sortCode ? 1 : 0,
				stdout: '',
				stderr: ''
			});
		}
	};
});

vi.mock('@clack/prompts', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();

	return {
		...actual,
		confirm: () => {
			calls.confirms += 1;

			return Promise.resolve(false);
		}
	};
});

const run = promisify(execFile);

const originalExitCode = process.exitCode;
const originalCwd = process.cwd();

afterEach(() => {
	process.exitCode = originalExitCode;
	process.chdir(originalCwd);
	calls.install = [];
	calls.bins = [];
	calls.sortCode = '';
	calls.confirms = 0;
});

const runInit = async (...args: readonly string[]): Promise<{ stdout: string; stderr: string }> => {
	const program = createProgram({ exitOverride: true });
	let stderr = '';

	const stdout = await capture(process.stdout, async () => {
		stderr = await capture(process.stderr, () => {
			return runProgram(program, ['node', 'jss-devtools', 'init', ...args]);
		});
	});

	return {
		stdout,
		stderr
	};
};

const usePnpmProject = async (): Promise<string> => {
	const dir = await makeEmptyDir();

	writeFileSync(join(dir, 'package.json'), '{"name":"x","packageManager":"pnpm@11.24.0"}\n');
	writeFileSync(join(dir, 'tsconfig.json'), '{}\n');
	await run('git', ['init'], { cwd: dir });
	process.chdir(dir);

	return dir;
};

describe('init wired through commander', () => {
	it('with -y and no TTY, reaches the install without prompting, using the detected manager', async () => {
		const dir = await usePnpmProject();

		const { stderr } = await runInit('-y');

		expect(calls.confirms).toBe(0);
		// macOS resolves /var to /private/var under process.chdir, and process.cwd() follows it
		expect(calls.install).toEqual([['pnpm', realpathSync(dir)]]);
		expect(stderr).toContain('install failed; the files are written');
		expect(stderr).toContain('$ pnpm install');
		expect(stderr).not.toContain('$ cd');
		expect(process.exitCode).toBe(1);
		expect(existsSync(join(dir, 'eslint.config.mjs'))).toBe(true);
	}, 30_000);

	it('sorts with the detected manager after a successful install', async () => {
		await usePnpmProject();
		calls.installCode = 0;

		const { stdout } = await runInit('-y');

		expect(calls.bins).toEqual([
			['pnpm', 'prettier-package-json'],
			['pnpm', 'prettier']
		]);
		expect(stdout).toContain('Next steps');
		expect(stdout).toContain('$ pnpm run format');
		expect(stdout).not.toContain('$ cd');
		expect(process.exitCode ?? 0).toBe(0);
	}, 30_000);

	it('exits 1 naming the bin when the sort fails', async () => {
		await usePnpmProject();
		calls.installCode = 0;
		calls.sortCode = 'prettier-package-json';

		const { stderr } = await runInit('-y');

		expect(stderr).toContain('prettier-package-json failed; the files are written');
		expect(stderr).toContain('To finish:');
		expect(stderr).toContain('$ pnpm exec prettier-package-json --write package.json');
		expect(process.exitCode).toBe(1);
	}, 30_000);

	it('drops the cd line when the sort fails in the current folder', async () => {
		const dir = await makeEmptyDir();

		process.chdir(dir);
		calls.installCode = 0;
		calls.sortCode = 'prettier-package-json';

		const { stderr } = await runInit('.', '-y');

		expect(stderr).toContain('prettier-package-json failed; the files are written');
		expect(stderr).toContain('$ npx prettier-package-json --write package.json');
		expect(stderr).not.toContain('$ cd');
		expect(process.exitCode).toBe(1);
	}, 30_000);

	it('leaves .vscode/ out of the plan and of the folder with --no-vscode', async () => {
		const dir = await usePnpmProject();

		calls.installCode = 0;

		const { stdout } = await runInit('--no-vscode', '-y');

		expect(stdout).not.toContain('.vscode/');
		expect(process.exitCode ?? 0).toBe(0);
		expect(existsSync(join(dir, '.vscode'))).toBe(false);
	}, 30_000);
});
