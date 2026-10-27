import { chmod, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
	detectPackageManager,
	installPackages,
	packageManagerVersion,
	resolveLocalBin,
	runLocalBin
} from '@/core/adapters/package-manager.adapter';

import { removeDir } from './support/tmp-dir';

import type { PackageManagerName } from '@/core/adapters/package-manager.adapter';

const dirs: string[] = [];

const makeDir = async (): Promise<string> => {
	const dir = await mkdtemp(join(tmpdir(), 'jss-devtools-pm-'));

	dirs.push(dir);

	return dir;
};

afterEach(async () => {
	for (const dir of dirs.splice(0)) {
		await removeDir(dir);
	}
});

const write = async (dir: string, name: string, content: string): Promise<void> => {
	await writeFile(join(dir, name), content);
};

describe('detecting the package manager', () => {
	it.each([
		['bun.lockb', 'bun'],
		['bun.lock', 'bun'],
		['pnpm-lock.yaml', 'pnpm'],
		['yarn.lock', 'yarn'],
		['package-lock.json', 'npm']
	])('reads %s as %s', async (lockfile, name) => {
		const dir = await makeDir();

		await write(dir, lockfile, '');

		const detected = await detectPackageManager(dir);

		expect(detected?.name).toBe(name);
	});

	it('prefers the first lockfile of the order over a later one', async () => {
		const dir = await makeDir();

		await write(dir, 'bun.lock', '');
		await write(dir, 'package-lock.json', '');

		expect((await detectPackageManager(dir))?.name).toBe('bun');
	});

	it('lets a packageManager field win over a lockfile', async () => {
		const dir = await makeDir();

		await write(dir, 'package-lock.json', '');
		await write(dir, 'package.json', JSON.stringify({ packageManager: 'pnpm@10.17.0' }));

		const detected = await detectPackageManager(dir);

		expect(detected?.name).toBe('pnpm');
		expect(detected?.agent).toBe('pnpm');
	});

	it('resolves a yarn packageManager field above 1 to the yarn berry agent', async () => {
		const dir = await makeDir();

		await write(dir, 'package.json', JSON.stringify({ packageManager: 'yarn@4.9.2' }));

		const detected = await detectPackageManager(dir);

		expect(detected?.name).toBe('yarn');
		expect(detected?.agent).toBe('yarn@berry');
	});

	it('ignores a parent lockfile because detection stops at the project folder', async () => {
		const parent = await makeDir();
		const child = join(parent, 'project');

		await mkdir(child);

		await write(parent, 'package-lock.json', '');
		await write(child, 'package.json', '{}');

		expect(await detectPackageManager(child)).toBeNull();
	});

	it('returns null when nothing in the folder says which manager is used', async () => {
		const dir = await makeDir();

		expect(await detectPackageManager(dir)).toBeNull();
	});
});

describe('the package manager adapter', () => {
	it('reads the version of the installed npm', async () => {
		const dir = await makeDir();

		expect(await packageManagerVersion('npm', dir)).toMatch(/^\d+\./);
	});

	it('returns null for a manager that is not installed', async () => {
		const dir = await makeDir();

		expect(await packageManagerVersion('jss-devtools-no-such-pm' as PackageManagerName, dir)).toBeNull();
	});
});

describe('resolving the local-bin command', () => {
	it('keeps the -- separator that yarn needs', () => {
		const { command, args } = resolveLocalBin('yarn', 'prettier', ['--write']);

		expect(command).toBe('yarn');
		expect(args).toEqual(['exec', 'prettier', '--', '--write']);
	});

	it('hands the bin and its arguments to npx for npm', () => {
		const { command, args } = resolveLocalBin('npm', 'prettier', ['--write']);

		expect(command).toBe('npx');
		expect(args).toEqual(['prettier', '--write']);
	});
});

describe('installing packages', () => {
	it('installs a package.json without dependencies', async () => {
		const dir = await makeDir();

		await write(
			dir,
			'package.json',
			JSON.stringify({
				name: 'x',
				version: '0.0.0'
			})
		);

		expect(await installPackages('npm', dir)).toBe(0);
	});

	it('fails on a package.json that does not parse', async () => {
		const dir = await makeDir();

		await write(dir, 'package.json', '{ not json');

		expect(await installPackages('npm', dir)).not.toBe(0);
	});
});

describe('running a local bin', () => {
	it('runs a bin from node_modules/.bin with its arguments', async () => {
		const dir = await makeDir();
		const bin = join(dir, 'node_modules', '.bin', 'hello');

		await mkdir(join(dir, 'node_modules', '.bin'), {
			recursive: true
		});
		await writeFile(bin, '#!/bin/sh\necho "arg=$1"\n');
		await chmod(bin, 0o755);

		const result = await runLocalBin('npm', 'hello', ['a'], dir);

		expect(result.code).toBe(0);
		expect(result.stdout).toContain('a');
	});
});
