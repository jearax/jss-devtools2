import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Outside the repo, so `node_modules` resolution cannot reach it. */
export const makeEmptyDir = async (): Promise<string> => {
	return mkdtemp(join(tmpdir(), 'jss-devtools-'));
};

export const removeDir = async (dir: string): Promise<void> => {
	return rm(dir, {
		recursive: true,
		force: true
	});
};
