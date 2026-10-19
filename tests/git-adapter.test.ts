import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { gitVersion, isInsideWorkTree } from '@/core/adapters/git.adapter.js';

import { makeEmptyDir, removeDir } from './support/tmp-dir.js';

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

	it('knows a directory inside a work tree', async () => {
		const repo = await makeEmptyDir();

		dirs.push(repo);

		await run('git', ['init'], { cwd: repo });

		expect(await isInsideWorkTree(repo)).toBe(true);
	});

	it('knows a directory outside a work tree', async () => {
		const plain = await makeEmptyDir();

		dirs.push(plain);

		expect(await isInsideWorkTree(plain)).toBe(false);
	});
});
