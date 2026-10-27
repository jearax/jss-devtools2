import { execFile } from 'node:child_process';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { preflightInit } from '@/commands/init/preflight.service';

import { snapshotDir } from './support/fs-snapshot';
import { makeEmptyDir, removeDir } from './support/tmp-dir';

const run = promisify(execFile);

const dirs: string[] = [];

afterEach(async () => {
	for (const dir of dirs.splice(0)) {
		await removeDir(dir);
	}
});

const makeProject = async (files: Record<string, string>): Promise<string> => {
	const dir = await makeEmptyDir();

	dirs.push(dir);

	for (const [name, content] of Object.entries(files)) {
		const full = join(dir, name);

		await mkdir(dirname(full), { recursive: true });
		await writeFile(full, content);
	}

	return dir;
};

const gitInit = async (dir: string): Promise<void> => {
	await run('git', ['init', '-q', dir]);
};

const makeGitProject = async (files: Record<string, string>): Promise<string> => {
	const dir = await makeProject(files);

	await gitInit(dir);

	return dir;
};

const stubOnPath = async (name: string, script: string): Promise<string> => {
	const dir = await makeEmptyDir();

	dirs.push(dir);
	await writeFile(join(dir, name), script, { mode: 0o755 });

	return dir;
};

const withPath = async <T>(stubDirs: readonly string[], body: () => Promise<T>): Promise<T> => {
	const original = process.env['PATH'];

	// Replaces PATH entirely: a bare stub dir is how a missing tool is simulated.
	process.env['PATH'] = stubDirs.join(':');

	try {
		return await body();
	} finally {
		if (original === undefined) {
			delete process.env['PATH'];
		} else {
			process.env['PATH'] = original;
		}
	}
};

const failureMessage = async (runPreflight: () => Promise<unknown>): Promise<string> => {
	try {
		await runPreflight();
	} catch (error) {
		return (error as Error).message;
	}

	throw new Error('expected the preflight to fail');
};

const EXISTING_PROJECT = {
	'package.json': '{"name":"x","version":"0.0.0"}',
	'tsconfig.json': '{}\n'
};

const expectUnchanged = (dir: string, before: string): void => {
	expect(snapshotDir(dir)).toBe(before);
};

describe('preflight, create mode', () => {
	it('accepts a missing <dir>', async () => {
		const parent = await makeEmptyDir();

		dirs.push(parent);
		const result = await preflightInit(process.cwd(), [join(parent, 'my-app')], {});

		expect(result.mode).toBe('create');
		expect(result.pm).toBe('npm');
		expect(result.projectName).toBe('my-app');
	});

	it('accepts an empty folder, the init . case', async () => {
		const dir = await makeEmptyDir();

		dirs.push(dir);
		const result = await preflightInit(process.cwd(), [dir], {});

		expect(result.mode).toBe('create');
		expect(result.projectName.length).toBeGreaterThan(0);
	});

	it('exits 1 for a folder that is not empty, and the folder is unchanged', async () => {
		const dir = await makeProject({ 'keep.txt': 'x' });
		const before = snapshotDir(dir);

		expect(
			await failureMessage(() => {
				return preflightInit(process.cwd(), [dir], {});
			})
		).toBe(`${dir} is not empty; to set up the project in it: cd ${dir} && jss-devtools init`);
		expectUnchanged(dir, before);
	});

	it('exits 1 when git is not on PATH', async () => {
		const dir = await makeEmptyDir();

		dirs.push(dir);
		const empty = await makeEmptyDir();

		dirs.push(empty);

		await withPath([empty], async () => {
			const before = snapshotDir(dir);

			expect(
				await failureMessage(() => {
					return preflightInit(process.cwd(), [dir], {});
				})
			).toBe('git is not installed');
			expectUnchanged(dir, before);
		});
	});

	it('exits 1 when git --version fails', async () => {
		const dir = await makeEmptyDir();

		dirs.push(dir);
		const stub = await stubOnPath('git', '#!/bin/sh\nexit 3\n');

		await withPath([stub], async () => {
			const before = snapshotDir(dir);

			expect(
				await failureMessage(() => {
					return preflightInit(process.cwd(), [dir], {});
				})
			).toBe('git --version failed with exit code 3');
			expectUnchanged(dir, before);
		});
	});

	it('exits 1 when the chosen package manager is not installed, and the folder is unchanged', async () => {
		const dir = await makeEmptyDir();

		dirs.push(dir);
		const stub = await stubOnPath('pnpm', '#!/bin/sh\nexit 1\n');

		await writeFile(join(stub, 'git'), '#!/bin/sh\necho "git version 2.40.0"\n', { mode: 0o755 });

		await withPath([stub], async () => {
			const before = snapshotDir(dir);

			expect(
				await failureMessage(() => {
					return preflightInit(process.cwd(), [dir], { pm: 'pnpm' });
				})
			).toBe('pnpm is not installed; install it, or pick another with --pm');
			expectUnchanged(dir, before);
		});
	});
});

describe('preflight, existing mode', () => {
	it('exits 1 without a package.json', async () => {
		const dir = await makeEmptyDir();

		dirs.push(dir);
		const before = snapshotDir(dir);

		expect(
			await failureMessage(() => {
				return preflightInit(dir, [], {});
			})
		).toBe('no package.json here; to create a project: jss-devtools init <name>');
		expectUnchanged(dir, before);
	});

	it('exits 1 with the parse error for a package.json that does not parse', async () => {
		const dir = await makeProject({ 'package.json': '{oops' });
		const before = snapshotDir(dir);
		let parseError = '';

		try {
			JSON.parse('{oops');
		} catch (error) {
			parseError = (error as Error).message;
		}

		expect(
			await failureMessage(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(parseError);
		expectUnchanged(dir, before);
	});

	it('exits 1 for a workspaces field', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'package.json': '{"name":"x","workspaces":["packages/*"]}'
		});

		const before = snapshotDir(dir);

		expect(
			await failureMessage(() => {
				return preflightInit(dir, [], {});
			})
		).toBe('monorepos are not supported yet');
		expectUnchanged(dir, before);
	});

	it('accepts a pnpm-workspace.yaml without a top-level packages field', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'pnpm-workspace.yaml': 'allowBuilds:\n  esbuild: true\n  unrs-resolver: true\n'
		});

		const result = await preflightInit(dir, [], {});

		expect(result.mode).toBe('existing');
	});

	it('exits 1 when pnpm-workspace.yaml cannot be extended line by line', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'package.json': '{"name":"x","packageManager":"pnpm@11.24.0"}',
			'pnpm-workspace.yaml': 'allowBuilds: { esbuild: true }\n'
		});

		const before = snapshotDir(dir);

		expect(
			await failureMessage(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(
			'pnpm-workspace.yaml cannot be extended line by line; add these entries by hand: allowBuilds.esbuild: true, allowBuilds.unrs-resolver: true'
		);
		expectUnchanged(dir, before);
	});

	it('exits 1 for a pnpm-workspace.yaml', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'pnpm-workspace.yaml': 'packages:\n  - x\n'
		});

		const before = snapshotDir(dir);

		expect(
			await failureMessage(() => {
				return preflightInit(dir, [], {});
			})
		).toBe('monorepos are not supported yet');
		expectUnchanged(dir, before);
	});

	it('exits 1 without a tsconfig.json', async () => {
		const dir = await makeGitProject({ 'package.json': EXISTING_PROJECT['package.json'] });
		const before = snapshotDir(dir);

		expect(
			await failureMessage(() => {
				return preflightInit(dir, [], {});
			})
		).toBe('no tsconfig.json here; init sets up TypeScript projects. To create one: jss-devtools init <name>');
		expectUnchanged(dir, before);
	});

	it('exits 1 when there is no git repository at all', async () => {
		const dir = await makeProject(EXISTING_PROJECT);
		const before = snapshotDir(dir);

		expect(
			await failureMessage(() => {
				return preflightInit(dir, [], {});
			})
		).toBe('not a git repository; run git init first');
		expectUnchanged(dir, before);
	});

	it('exits 1 when the git root is a parent folder', async () => {
		const parent = await makeEmptyDir();

		dirs.push(parent);
		await gitInit(parent);

		const child = join(parent, 'sub');

		await mkdir(child);
		await writeFile(join(child, 'package.json'), EXISTING_PROJECT['package.json']);
		await writeFile(join(child, 'tsconfig.json'), EXISTING_PROJECT['tsconfig.json']);
		dirs.push(child);
		const before = snapshotDir(child);

		expect(
			await failureMessage(() => {
				return preflightInit(child, [], {});
			})
		).toBe('the git root is ..; run jss-devtools init there');
		expectUnchanged(child, before);
	});

	it('reports the relative git root when the project is reached through a symlink', async () => {
		const parent = await makeEmptyDir();

		dirs.push(parent);
		await gitInit(parent);

		const child = join(parent, 'sub');

		await mkdir(child);
		await writeFile(join(child, 'package.json'), EXISTING_PROJECT['package.json']);
		await writeFile(join(child, 'tsconfig.json'), EXISTING_PROJECT['tsconfig.json']);

		const link = join(parent, 'link');

		await symlink(child, link);
		dirs.push(link);
		const before = snapshotDir(child);

		expect(
			await failureMessage(() => {
				return preflightInit(link, [], {});
			})
		).toBe('the git root is ..; run jss-devtools init there');
		expectUnchanged(child, before);
	});

	it('passes the husky core.hooksPath values and exits 1 for another hook manager', async () => {
		for (const hooksPath of [undefined, '.husky/_', '.husky']) {
			const dir = await makeGitProject({ ...EXISTING_PROJECT });

			if (hooksPath !== undefined) {
				await run('git', ['-C', dir, 'config', 'core.hooksPath', hooksPath]);
			}

			const result = await preflightInit(dir, [], {});

			expect(result.mode).toBe('existing');
		}

		const dir = await makeGitProject({ ...EXISTING_PROJECT });

		await run('git', ['-C', dir, 'config', 'core.hooksPath', '.githooks']);
		const before = snapshotDir(dir);

		expect(
			await failureMessage(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(
			'git hooks are managed by .githooks (core.hooksPath); remove it with git config --unset core.hooksPath to use husky'
		);
		expectUnchanged(dir, before);
	});

	it('exits 1 for an unsupported detected manager', async () => {
		for (const [field, agent] of [
			['yarn@3.2.0', 'yarn@berry'],
			['pnpm@6.0.0', 'pnpm@6'],
			['deno@1.0.0', 'deno']
		] as const) {
			const dir = await makeGitProject({
				...EXISTING_PROJECT,
				'package.json': `{"name":"x","packageManager":"${field}"}`
			});

			const before = snapshotDir(dir);

			expect(
				await failureMessage(() => {
					return preflightInit(dir, [], {});
				})
			).toBe(`${agent} is not supported; supported: npm, yarn 1, pnpm, bun`);
			expectUnchanged(dir, before);
		}
	});

	it('reads npm when detection finds nothing, and the field when it names a supported manager', async () => {
		const plain = await makeGitProject({ ...EXISTING_PROJECT });
		const plainResult = await preflightInit(plain, [], {});

		expect(plainResult.pm).toBe('npm');

		const pnpm = await makeGitProject({
			...EXISTING_PROJECT,
			'package.json': '{"name":"x","packageManager":"pnpm@11.24.0"}'
		});

		const pnpmResult = await preflightInit(pnpm, [], {});

		expect(pnpmResult.pm).toBe('pnpm');
		expect(pnpmResult.pmVersion).toMatch(/^\d+\./);
	});

	it('exits 1 when the detected manager is not installed', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'package-lock.json': '{}'
		});

		const stub = await stubOnPath('npm', '#!/bin/sh\nexit 1\n');

		await withPath([stub], async () => {
			const before = snapshotDir(dir);

			expect(
				await failureMessage(() => {
					return preflightInit(dir, [], {});
				})
			).toBe('npm is not installed; install it');
			expectUnchanged(dir, before);
		});
	});

	it('exits 1 listing every config file init owns that is already there', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'eslint.config.mjs': 'old\n',
			'.prettierrc.yml': 'x\n',
			'.prettierrc.toml': 'x\n',
			'.editorconfig': 'old\n'
		});

		const before = snapshotDir(dir);

		expect(
			await failureMessage(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(
			'these files already exist: eslint.config.mjs, .prettierrc.yml, .prettierrc.toml, .editorconfig; to replace them: jss-devtools init --force'
		);
		expectUnchanged(dir, before);
	});

	it('exits 1 listing a prettier or commitlint key in package.json, and the folder is unchanged', async () => {
		for (const [key, value] of [
			['prettier', '{"singleQuote":true}'],
			['commitlint', '{"extends":["@commitlint/config-conventional"]}']
		] as const) {
			const dir = await makeGitProject({
				...EXISTING_PROJECT,
				'package.json': `{"name":"x","${key}":${value}}`
			});

			const before = snapshotDir(dir);

			expect(
				await failureMessage(() => {
					return preflightInit(dir, [], {});
				})
			).toBe(`these files already exist: package.json "${key}" key; to replace them: jss-devtools init --force`);
			expectUnchanged(dir, before);
		}
	});

	it('offers --no-vscode when a .vscode file is among the conflicts', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'.vscode/settings.json': '{}\n'
		});

		const before = snapshotDir(dir);

		expect(
			await failureMessage(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(
			'these files already exist: .vscode/settings.json; to replace them: jss-devtools init --force; or pass --no-vscode'
		);
		expectUnchanged(dir, before);
	});

	it('does not list .vscode files with --no-vscode', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'.vscode/settings.json': '{}\n'
		});

		const result = await preflightInit(dir, [], { vscode: false });

		expect(result.mode).toBe('existing');
	});

	it('passes with conflicts when -f is given', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'eslint.config.mjs': 'old\n'
		});

		const result = await preflightInit(dir, [], { force: true });

		expect(result.mode).toBe('existing');
	});
});
