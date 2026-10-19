import { execFile } from 'node:child_process';
import { copyFile, symlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { makeEmptyDir, removeDir } from './support/tmp-dir.js';

const run = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('standalone bundle', () => {
	let sandbox: string;

	beforeAll(async () => {
		sandbox = await makeEmptyDir();
		await copyFile(resolve(projectRoot, 'dist/cli.mjs'), resolve(sandbox, 'cli.mjs'));
	});

	afterAll(async () => {
		await removeDir(sandbox);
	});

	const runEntry = async (entry: string, ...args: readonly string[]): Promise<{ stdout: string; code: number }> => {
		try {
			const { stdout } = await run(process.execPath, [entry, ...args], { cwd: sandbox });

			return {
				stdout,
				code: 0
			};
		} catch (error) {
			const failure = error as { stdout?: string; code?: number };

			return {
				stdout: failure.stdout ?? '',
				code: failure.code ?? -1
			};
		}
	};

	const cli = async (...args: readonly string[]): Promise<{ stdout: string; code: number }> => {
		return runEntry('cli.mjs', ...args);
	};

	it('has no node_modules to resolve runtime dependencies from', async () => {
		const { stdout } = await run(
			process.execPath,
			['-e', "console.log(require('node:fs').existsSync('node_modules'))"],
			{
				cwd: sandbox
			}
		);

		expect(stdout.trim()).toBe('false');
	});

	it('prints help', async () => {
		const { stdout, code } = await cli('--help');

		expect(code).toBe(0);
		expect(stdout).toContain('Usage: jss-devtools');
	});

	it('prints a version', async () => {
		const { stdout, code } = await cli('--version');

		expect(code).toBe(0);
		expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
	});

	it('exits non-zero on an unknown command', async () => {
		const { code } = await cli('nope');

		expect(code).toBe(1);
	});

	it('runs through a symlink, the way bin shims and installers link it', async () => {
		await symlink(resolve(sandbox, 'cli.mjs'), resolve(sandbox, 'jss-devtools'));

		const version = await runEntry('jss-devtools', '--version');
		const unknown = await runEntry('jss-devtools', 'nope');

		expect(version.code).toBe(0);
		expect(version.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
		expect(unknown.code).toBe(1);
	});
});
