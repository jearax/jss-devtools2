import { execFile } from 'node:child_process';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { validateInitArguments } from '@/commands/init/init.service';
import { derivePackageName } from '@/commands/init/plan.service';
import { preflightInit } from '@/commands/init/preflight.service';
import { applyInitPlan } from '@/commands/init/write.service';
import { ExitCode } from '@/core/constants/exit-code.constant';
import { CliError } from '@/core/errors/cli.error';
import { renderError } from '@/core/ui/terminal.ui';

import { capture } from './support/capture-stream';
import { makeEmptyDir, removeDir } from './support/tmp-dir';

const run = promisify(execFile);

const dirs: string[] = [];

const originalPath = process.env['PATH'];
const originalNoColor = process.env['NO_COLOR'];

beforeEach(() => {
	process.env['NO_COLOR'] = '1';
});

afterEach(async () => {
	if (originalPath === undefined) {
		delete process.env['PATH'];
	} else {
		process.env['PATH'] = originalPath;
	}

	if (originalNoColor === undefined) {
		delete process.env['NO_COLOR'];
	} else {
		process.env['NO_COLOR'] = originalNoColor;
	}

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

const stubDir = async (scripts: Record<string, string>): Promise<string> => {
	const dir = await makeEmptyDir();

	dirs.push(dir);

	for (const [name, script] of Object.entries(scripts)) {
		await writeFile(join(dir, name), script, { mode: 0o755 });
	}

	return dir;
};

const withPath = async <T>(stubDirs: readonly string[], body: () => Promise<T>): Promise<T> => {
	process.env['PATH'] = stubDirs.join(':');

	return body();
};

const failure = async (runBlock: () => Promise<unknown>): Promise<string> => {
	try {
		await runBlock();
	} catch (error) {
		const cliError = error as CliError;

		expect(cliError).toBeInstanceOf(CliError);
		expect(cliError.exitCode).toBe(ExitCode.failure);

		const stderr = await capture(process.stderr, () => {
			renderError(cliError);
		});

		expect(stderr).not.toContain('\u001b');

		return stderr;
	}

	throw new Error('expected the run to fail');
};

const renderFailure = (cliError: CliError): string => {
	const chunks: string[] = [];
	const original = process.stderr.write.bind(process.stderr);

	process.stderr.write = (chunk: string | Uint8Array): boolean => {
		chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());

		return true;
	};

	try {
		renderError(cliError);
	} finally {
		process.stderr.write = original;
	}

	return chunks.join('');
};

const failureSync = (runBlock: () => unknown): string => {
	try {
		runBlock();
	} catch (error) {
		const cliError = error as CliError;

		expect(cliError).toBeInstanceOf(CliError);
		expect(cliError.exitCode).toBe(ExitCode.failure);

		const stderr = renderFailure(cliError);

		expect(stderr).not.toContain('\u001b');

		return stderr;
	}

	throw new Error('expected the run to fail');
};

const EXISTING_PROJECT = {
	'package.json': '{"name":"x","version":"0.0.0"}',
	'tsconfig.json': '{}\n'
};

const makeSubProject = async (): Promise<{ parent: string; child: string }> => {
	const parent = await makeProject({});
	const child = join(parent, 'sub');

	await gitInit(parent);
	await mkdir(child);
	await writeFile(join(child, 'package.json'), EXISTING_PROJECT['package.json']);
	await writeFile(join(child, 'tsconfig.json'), EXISTING_PROJECT['tsconfig.json']);
	dirs.push(child);

	return {
		parent,
		child
	};
};

describe('the exit 1 output, one test per error row', () => {
	it('E1: a folder that is not empty', async () => {
		const dir = await makeProject({ 'keep.txt': 'x' });

		expect(
			await failure(() => {
				return preflightInit(process.cwd(), [dir], {});
			})
		).toBe(
			[
				'│',
				`└  Folder ${dir} is not empty`,
				'   To set it up instead:',
				`     $ cd ${dir}`,
				'     $ jss-devtools init',
				''
			].join('\n')
		);
	});

	it('E2: the target is a file', async () => {
		const dir = await makeProject({ 'keep.txt': 'x' });
		const target = join(dir, 'keep.txt');

		expect(
			await failure(() => {
				return preflightInit(process.cwd(), [target], {});
			})
		).toBe(['│', `└  A file named ${target} already exists`, '   ↳ Pick another name', ''].join('\n'));
	});

	it('E3: git is not installed', async () => {
		const dir = await makeProject({});
		const empty = await stubDir({});

		expect(
			await failure(() => {
				return withPath([empty], () => {
					return preflightInit(process.cwd(), [dir], {});
				});
			})
		).toBe(['│', '└  Git is not installed', '   ↳ Install git, then rerun', ''].join('\n'));
	});

	it('E4: the chosen manager is not installed', async () => {
		const dir = await makeProject({});

		const stub = await stubDir({
			git: '#!/bin/sh\necho "git version 2.40.0"\n',
			pnpm: '#!/bin/sh\nexit 1\n'
		});

		expect(
			await failure(() => {
				return withPath([stub], () => {
					return preflightInit(process.cwd(), [dir], { pm: 'pnpm' });
				});
			})
		).toBe(
			['│', '└  Package manager pnpm is not installed', '   ↳ Install it, or pick another with --pm', ''].join('\n')
		);
	});

	it('E5: the detected manager is not installed', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'package-lock.json': '{}'
		});

		const stub = await stubDir({ npm: '#!/bin/sh\nexit 1\n' });

		expect(
			await failure(() => {
				return withPath([stub], () => {
					return preflightInit(dir, [], {});
				});
			})
		).toBe(['│', '└  This project uses npm, which is not installed', '   ↳ Install npm, then rerun', ''].join('\n'));
	});

	it('E6: yarn 2+ in create mode', async () => {
		const dir = await makeProject({});

		const stub = await stubDir({
			git: '#!/bin/sh\necho "git version 2.40.0"\n',
			yarn: '#!/bin/sh\necho "4.9.0"\n'
		});

		expect(
			await failure(() => {
				return withPath([stub], () => {
					return preflightInit(process.cwd(), [dir], { pm: 'yarn' });
				});
			})
		).toBe(['│', '└  Only yarn 1 is supported, found yarn 4.9.0', '   ↳ Pick another with --pm', ''].join('\n'));
	});

	it('E7: an unsupported detected manager', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'package.json': '{"name":"x","packageManager":"deno@1.0.0"}'
		});

		expect(
			await failure(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(['│', '└  Package manager deno is not supported', '   ↳ Supported: bun, pnpm, yarn 1, npm', ''].join('\n'));
	});

	it('E8: no package.json in existing mode', async () => {
		const dir = await makeProject({});

		expect(
			await failure(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(
			['│', '└  No package.json here', '   To create a project:', '     $ jss-devtools init <project-name>', ''].join(
				'\n'
			)
		);
	});

	it('E9: package.json is not valid JSON', async () => {
		const dir = await makeProject({ 'package.json': '{oops' });

		let parseError = '';

		try {
			JSON.parse('{oops');
		} catch (error) {
			parseError = (error as Error).message;
		}

		expect(
			await failure(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(['│', `└  Invalid JSON in package.json: ${parseError}`, '   ↳ Fix it, then rerun', ''].join('\n'));
	});

	it('E10: a workspaces field', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'package.json': '{"name":"x","workspaces":["packages/*"]}'
		});

		expect(
			await failure(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(['│', '└  Monorepos are not supported yet', ''].join('\n'));
	});

	it('E11: no tsconfig.json', async () => {
		const dir = await makeGitProject({ 'package.json': EXISTING_PROJECT['package.json'] });

		expect(
			await failure(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(
			[
				'│',
				'└  No tsconfig.json here',
				'   To create a new project instead:',
				'     $ jss-devtools init <project-name>',
				''
			].join('\n')
		);
	});

	it('E12: not a git repository', async () => {
		const dir = await makeProject(EXISTING_PROJECT);

		expect(
			await failure(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(['│', '└  Not a git repository', '   To set one up:', '     $ git init', ''].join('\n'));
	});

	it('E13: run below the git root', async () => {
		const { child } = await makeSubProject();

		expect(
			await failure(() => {
				return preflightInit(child, [], {});
			})
		).toBe(
			['│', '└  This is not the git root', '   To run it there:', '     $ cd ..', '     $ jss-devtools init', ''].join(
				'\n'
			)
		);
	});

	it('E13: resolves the git root behind a symlink', async () => {
		const { parent, child } = await makeSubProject();
		const link = join(parent, 'link');

		await symlink(child, link);
		dirs.push(link);

		expect(
			await failure(() => {
				return preflightInit(link, [], {});
			})
		).toContain('     $ cd ..\n     $ jss-devtools init');
	});

	it('E14: another core.hooksPath', async () => {
		const dir = await makeGitProject({ ...EXISTING_PROJECT });

		await run('git', ['-C', dir, 'config', 'core.hooksPath', '.githooks']);

		expect(
			await failure(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(
			[
				'│',
				'└  Git hooks are managed by .githooks (core.hooksPath)',
				'   To use husky:',
				'     $ git config --unset core.hooksPath',
				''
			].join('\n')
		);
	});

	it('E15: a flow-style pnpm-workspace.yaml', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'package.json': '{"name":"x","packageManager":"pnpm@11.24.0"}',
			'pnpm-workspace.yaml': 'allowBuilds: { esbuild: true }\n'
		});

		expect(
			await failure(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(
			[
				'│',
				'└  Cannot extend pnpm-workspace.yaml line by line',
				'   ↳ Add esbuild: true and unrs-resolver: true under allowBuilds, then rerun',
				''
			].join('\n')
		);
	});

	it('E16: owned configs exist, without a .vscode file', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'eslint.config.mjs': 'old\n'
		});

		expect(
			await failure(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(
			['│', '└  Already set up: eslint.config.mjs', '   To replace them:', '     $ jss-devtools init --force', ''].join(
				'\n'
			)
		);
	});

	it('E16: owned configs exist, with a .vscode file in the list', async () => {
		const dir = await makeGitProject({
			...EXISTING_PROJECT,
			'.vscode/settings.json': '{}\n'
		});

		expect(
			await failure(() => {
				return preflightInit(dir, [], {});
			})
		).toBe(
			[
				'│',
				'└  Already set up: .vscode/settings.json',
				'   To replace them:',
				'     $ jss-devtools init --force',
				'   ↳ --no-vscode keeps .vscode/ as it is',
				''
			].join('\n')
		);
	});

	it('E17: a folder that cannot be a package name', () => {
		expect(
			failureSync(() => {
				derivePackageName('برنامج');
			})
		).toBe(
			['│', '└  Not a valid package name: برنامج', '   ↳ Use a folder name with Latin letters or digits', ''].join('\n')
		);
	});

	it('E18: git init fails in the new folder', async () => {
		const parent = await makeProject({});
		const target = join(parent, 'target');
		const stub = await stubDir({ git: '#!/bin/sh\nexit 1\n' });

		await withPath([stub], async () => {
			expect(
				await failure(() => {
					return applyInitPlan({
						mode: 'create',
						targetDir: target,
						entries: []
					});
				})
			).toBe(
				['│', '└  Could not run git init in target', '   To see why:', '     $ cd target', '     $ git init', ''].join(
					'\n'
				)
			);
		});
	});

	it('E19: a framework other than node', () => {
		expect(
			failureSync(() => {
				validateInitArguments([], { framework: 'react' });
			})
		).toBe(['│', '└  Framework react is not supported yet', '   ↳ Only node is', ''].join('\n'));
	});

	it('E20: --pm without a folder', () => {
		expect(
			failureSync(() => {
				validateInitArguments([], { pm: 'pnpm' });
			})
		).toBe(['│', '└  Option --pm needs <dir>', '   ↳ An existing project uses the manager it has', ''].join('\n'));
	});

	it('E21: -f with a folder', () => {
		expect(
			failureSync(() => {
				validateInitArguments(['my-app'], { force: true });
			})
		).toBe(['│', '└  Option --force is for an existing project', '   ↳ Drop it when creating one', ''].join('\n'));
	});
});
