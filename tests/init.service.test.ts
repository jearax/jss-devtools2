import { describe, expect, it } from 'vitest';

import { resolveInitMode, validateInitArguments } from '@/commands/init/init.service';

import { snapshotDir } from './support/fs-snapshot';
import { makeEmptyDir, removeDir } from './support/tmp-dir';

const messageOf = (run: () => void): string => {
	try {
		run();
	} catch (error) {
		return (error as Error).message;
	}

	throw new Error('expected the arguments to be rejected');
};

const expectsUnchangedDir = (dir: string, before: string): void => {
	expect(snapshotDir(dir)).toBe(before);
};

describe('init argument rules', () => {
	it('exits 1 for a framework other than node, and the folder is unchanged', async () => {
		const dir = await makeEmptyDir();
		const before = snapshotDir(dir);

		expect(
			messageOf(() => {
				validateInitArguments([], { framework: 'react' });
			})
		).toBe('react is not supported yet; only node is');
		expectsUnchangedDir(dir, before);

		await removeDir(dir);
	});

	it('exits 1 for --pm without <dir>, and the folder is unchanged', async () => {
		const dir = await makeEmptyDir();
		const before = snapshotDir(dir);

		expect(
			messageOf(() => {
				validateInitArguments([], { pm: 'pnpm' });
			})
		).toBe('--pm only applies when creating a project; here the package manager is detected');
		expectsUnchangedDir(dir, before);

		await removeDir(dir);
	});

	it('exits 1 for -f with <dir>, and the folder is unchanged', async () => {
		const dir = await makeEmptyDir();
		const before = snapshotDir(dir);

		expect(
			messageOf(() => {
				validateInitArguments(['my-app'], { force: true });
			})
		).toBe('-f, --force only applies when setting up an existing project; a new project has nothing to replace');
		expectsUnchangedDir(dir, before);

		await removeDir(dir);
	});

	it('picks create mode with <dir> and existing mode without', () => {
		expect(resolveInitMode(['my-app'])).toBe('create');
		expect(resolveInitMode([])).toBe('existing');
	});
});
