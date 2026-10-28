import { execFile } from 'node:child_process';
import { realpath, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { gitHooksPath, gitInit, gitTopLevel, gitVersion } from '@/core/adapters/git.adapter';

import { makeEmptyDir, removeDir } from './support/tmp-dir';

const run = promisify(execFile);

const dirs: string[] = [];

afterEach(async () => {
	for (const dir of dirs.splice(0)) {
		await removeDir(dir);
	}
});

describe('the git adapter', () => {
	it('reads the version of git', async () => {
		const version = await gitVersion();

		if (version.status !== 'ok') {
			throw new Error(version.problem);
		}

		expect(version.output).toMatch(/^git version /);
	});

	it('reports a git that fails', async () => {
		const stub = await makeEmptyDir();

		dirs.push(stub);

		await writeFile(resolve(stub, 'git'), '#!/bin/sh\nexit 3\n', { mode: 0o755 });

		const originalPath = process.env['PATH'];

		process.env['PATH'] = `${stub}:${originalPath ?? ''}`;

		try {
			const version = await gitVersion();

			expect(version).toEqual({
				status: 'failed',
				problem: 'git --version failed with exit code 3'
			});
		} finally {
			if (originalPath === undefined) {
				delete process.env['PATH'];
			} else {
				process.env['PATH'] = originalPath;
			}
		}
	});

	it('initializes a repository on branch main whatever init.defaultBranch says', async () => {
		const repo = await makeEmptyDir();
		const config = await makeEmptyDir();

		dirs.push(repo, config);

		await writeFile(resolve(config, 'config'), '[init]\n\tdefaultBranch = trunk\n');

		const original = process.env['GIT_CONFIG_GLOBAL'];

		process.env['GIT_CONFIG_GLOBAL'] = resolve(config, 'config');

		try {
			await gitInit(repo);

			const { stdout } = await run('git', ['symbolic-ref', '--short', 'HEAD'], { cwd: repo });

			expect(stdout.trim()).toBe('main');
		} finally {
			if (original === undefined) {
				delete process.env['GIT_CONFIG_GLOBAL'];
			} else {
				process.env['GIT_CONFIG_GLOBAL'] = original;
			}
		}
	});

	it('returns false when the folder to initialize does not exist', async () => {
		const dir = await makeEmptyDir();

		dirs.push(dir);

		expect(await gitInit(resolve(dir, 'no-such-child'))).toBe(false);
	});

	it('reads core.hooksPath when it is unset and when it is set', async () => {
		const repo = await makeEmptyDir();

		dirs.push(repo);

		await run('git', ['init'], { cwd: repo });

		expect(await gitHooksPath(repo)).toBeNull();

		await run('git', ['config', 'core.hooksPath', '.husky/_'], { cwd: repo });

		expect(await gitHooksPath(repo)).toBe('.husky/_');
	});

	it('reads the top level of a repository and null outside one', async () => {
		const repo = await makeEmptyDir();
		const plain = await makeEmptyDir();

		dirs.push(repo, plain);

		await run('git', ['init'], { cwd: repo });

		expect(await gitTopLevel(repo)).toBe(await realpath(repo));
		expect(await gitTopLevel(plain)).toBeNull();
	});
});
