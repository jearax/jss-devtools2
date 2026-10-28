import { execFile } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProgram, runProgram } from '@/cli';

import { capture } from './support/capture-stream';
import { makeEmptyDir, removeDir } from './support/tmp-dir';

const install = vi.hoisted(() => {
	return {
		lines: [] as string[],
		code: 0
	};
});

vi.mock('@/core/adapters/package-manager.adapter', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();

	return {
		...actual,
		installPackages: (_pm: unknown, _cwd: unknown, onLine?: (line: string) => void): Promise<number | null> => {
			for (const line of install.lines) {
				onLine?.(line);
			}

			return Promise.resolve(install.code);
		},
		runLocalBin: (): Promise<{ code: number; stdout: string; stderr: string }> => {
			return Promise.resolve({
				code: 0,
				stdout: '',
				stderr: ''
			});
		}
	};
});

const run = promisify(execFile);

const dirs: string[] = [];
const originalCwd = process.cwd();

afterEach(async () => {
	process.chdir(originalCwd);

	for (const dir of dirs.splice(0)) {
		await removeDir(dir);
	}
});

beforeEach(() => {
	install.lines = [];
	install.code = 0;
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

describe('the init install step, piped', () => {
	it('shows the install lines between the step lines and exits 0', async () => {
		const dir = await makeEmptyDir();

		dirs.push(dir);
		process.chdir(dir);
		await run('git', ['init'], { cwd: dir });
		writeFileSync(join(dir, 'package.json'), '{}\n');
		writeFileSync(join(dir, 'tsconfig.json'), '{}\n');
		install.lines = ['added 248 packages, and audited 249 packages in 12s', 'found 0 vulnerabilities'];

		const { stdout } = await runInit('-y');
		const start = stdout.indexOf('Installing with npm');
		const firstLine = stdout.indexOf('added 248 packages, and audited 249 packages in 12s');
		const secondLine = stdout.indexOf('│  found 0 vulnerabilities');
		const done = stdout.indexOf('Installed with npm');

		expect(stdout).toContain('10 to create, 1 to update');
		expect(stdout).toContain('~ package.json');
		expect(start).toBeGreaterThan(-1);
		expect(firstLine).toBeGreaterThan(start);
		expect(secondLine).toBeGreaterThan(firstLine);
		expect(done).toBeGreaterThan(secondLine);
		expect(stdout).toContain('(0.0s)');
		expect(stdout).toContain('Sorted package.json');
		expect(stdout).toContain('Next steps');
		expect(stdout).toContain('$ npm run format');
		expect(stdout).not.toContain('$ cd');
		expect(stdout).not.toContain('\u001b');
		expect(process.exitCode).toBeUndefined();
	});

	it('lists cd and dev after a create run', async () => {
		const dir = await makeEmptyDir();

		dirs.push(dir);
		process.chdir(dir);

		const { stdout } = await runInit('my-app', '-y');

		expect(stdout).toContain('Next steps');
		expect(stdout).toContain('$ cd my-app');
		expect(stdout).toContain('$ npm run dev');
		expect(stdout.indexOf('$ cd my-app')).toBeLessThan(stdout.indexOf('$ npm run dev'));
		expect(stdout).not.toContain('\u001b');
		expect(process.exitCode).toBeUndefined();
	});

	it('drops the cd line when the target is the current folder', async () => {
		const dir = await makeEmptyDir();

		dirs.push(dir);
		process.chdir(dir);

		const { stdout } = await runInit('.', '-y');

		expect(stdout).toContain('Next steps');
		expect(stdout).toContain('$ npm run dev');
		expect(stdout).not.toContain('$ cd');
		expect(process.exitCode).toBeUndefined();
	});

	it('drops the cd line in the failure list too when the install fails in the current folder', async () => {
		const dir = await makeEmptyDir();

		dirs.push(dir);
		process.chdir(dir);
		install.code = 1;

		const { stderr } = await runInit('.', '-y');

		expect(stderr).toContain('install failed; the files are written');
		expect(stderr).toContain('$ npm install');
		expect(stderr).not.toContain('$ cd');
		expect(process.exitCode).toBe(1);
	});

	it('keeps the lines and the failed title when the install exits 1', async () => {
		const dir = await makeEmptyDir();

		dirs.push(dir);
		process.chdir(dir);
		await run('git', ['init'], { cwd: dir });
		writeFileSync(join(dir, 'package.json'), '{}\n');
		writeFileSync(join(dir, 'tsconfig.json'), '{}\n');
		install.lines = ['npm error code EACCES'];
		install.code = 1;

		const { stdout, stderr } = await runInit('-y');

		expect(stdout).toContain('│  npm error code EACCES');
		expect(stdout).toContain('■  Installing with npm');
		expect(stdout).not.toContain('Installed with');
		expect(stderr).toContain('install failed; the files are written');
		expect(stderr).toContain('$ npm install');
		expect(stderr).not.toContain('\u001b');
		expect(process.exitCode).toBe(1);
		expect(existsSync(join(dir, 'eslint.config.mjs'))).toBe(true);
	});
});
