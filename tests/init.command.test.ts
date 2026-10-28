import { execFile } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProgram, runProgram } from '@/cli';
import { sortFailureMessage } from '@/commands/init/init.command';

import { capture } from './support/capture-stream';
import { snapshotDir } from './support/fs-snapshot';
import { makeEmptyDir } from './support/tmp-dir';

const interactivity = vi.hoisted(() => {
	return { enabled: false };
});

const answers = vi.hoisted(() => {
	return {
		pm: 'npm',
		confirm: true
	};
});

const selectCalls = vi.hoisted(() => {
	return [] as Array<{ message: string; options: Array<{ value: string; label: string }>; initialValue?: string }>;
});

vi.mock('@/core/ui/terminal.ui', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();

	return {
		...actual,
		isInteractive: () => {
			return interactivity.enabled;
		}
	};
});

vi.mock('@clack/prompts', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();

	return {
		...actual,
		select: (input: { message: string; options: Array<{ value: string; label: string }>; initialValue?: string }) => {
			selectCalls.push(input);

			return Promise.resolve(answers.pm);
		},
		confirm: () => {
			return Promise.resolve(answers.confirm);
		}
	};
});

const run = promisify(execFile);

const HELP_BLOCK = `Usage: jss-devtools init [options] [dir]

Create a project, or set up the current one

Arguments:
  dir                 Create a new project in this folder (missing or empty);
                      without it, set up the project in the current folder

Options:
  --framework <name>  Preset to apply; only node for now (values: "node" |
                      "react" | "rn" | "next" | "nest"; default: "node")
  --pm <name>         Package manager for a new project (values: "bun" | "pnpm"
                      | "yarn" | "npm"; default: "npm")
  -f, --force         Replace the config files init owns when they already
                      exist, and delete their other names (default: off; init
                      stops and lists them)
  --no-vscode         Do not write .vscode/ (default: written)
  -y, --yes           Do not ask; take the default answers (default: off; ask in
                      a terminal)
  --dry-run           Show the files that would change, write and install
                      nothing (default: off)
  -h, --help          Display help for command

Examples:
  $ jss-devtools init my-app              Create my-app, asking for the package manager
  $ jss-devtools init my-app --pm pnpm -y Create my-app with pnpm, no questions (CI)
  $ jss-devtools init                     Set up the project in the current folder
  $ jss-devtools init -f                  Replace existing ESLint, Prettier and commitlint configs
  $ jss-devtools init --dry-run           Show what would change, write nothing
`;

const originalExitCode = process.exitCode;
const originalCwd = process.cwd();
const originalRegistry = process.env['npm_config_registry'];

beforeEach(() => {
	selectCalls.length = 0;
	interactivity.enabled = false;
	answers.pm = 'npm';
	answers.confirm = true;
});

afterEach(() => {
	process.exitCode = originalExitCode;
	process.chdir(originalCwd);
	interactivity.enabled = false;

	if (originalRegistry === undefined) {
		delete process.env['npm_config_registry'];
	} else {
		process.env['npm_config_registry'] = originalRegistry;
	}
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

const useCwd = async (): Promise<string> => {
	const dir = await makeEmptyDir();

	process.chdir(dir);

	return dir;
};

const setupExistingProject = async (dir: string): Promise<void> => {
	writeFileSync(join(dir, 'package.json'), '{}\n');
	writeFileSync(join(dir, 'tsconfig.json'), '{}\n');
	await run('git', ['init'], { cwd: dir });
};

const useDeadRegistry = (): void => {
	process.env['npm_config_registry'] = 'http://127.0.0.1:9';
	// connection refused is instant, but npm retries each package with backoff for minutes
	process.env['npm_config_fetch_retries'] = '0';
};

describe('the init command', () => {
	it('prints its help exactly as documented', async () => {
		const { stdout } = await runInit('--help');

		expect(stdout).toBe(HELP_BLOCK);
		expect(process.exitCode).toBe(0);
	});

	it('exits 1 without a terminal when a question would be asked', async () => {
		const dir = await useCwd();
		const before = snapshotDir(dir);

		const { stderr } = await runInit();

		expect(stderr).toContain('run it in a terminal, or pass --yes');
		expect(process.exitCode).toBe(1);
		expect(snapshotDir(dir)).toBe(before);
	});

	it('exits 1 when the confirmation is declined, leaving the folder unchanged', async () => {
		const dir = await useCwd();

		await setupExistingProject(dir);
		const before = snapshotDir(dir);

		interactivity.enabled = true;
		answers.confirm = false;

		const { stderr } = await runInit();

		expect(stderr).toContain('cancelled, nothing written');
		expect(process.exitCode).toBe(1);
		expect(snapshotDir(dir)).toBe(before);
	});

	it('writes the plan, keeps the files when the install fails, and exits 1', async () => {
		const dir = await useCwd();

		await setupExistingProject(dir);
		interactivity.enabled = true;
		useDeadRegistry();

		const { stderr } = await runInit();

		expect(stderr).toContain('install failed; the files are written. To finish: npm install');
		expect(process.exitCode).toBe(1);
		expect(existsSync(join(dir, 'eslint.config.mjs'))).toBe(true);
		expect(existsSync(join(dir, '.prettierrc.json'))).toBe(true);
		expect(existsSync(join(dir, '.husky/pre-commit'))).toBe(true);
		expect(existsSync(join(dir, '.vscode/settings.json'))).toBe(true);
	}, 120_000);

	it('creates the folder and keeps its files when the create install fails', async () => {
		const dir = await useCwd();

		useDeadRegistry();

		const { stderr } = await runInit('my-app', '-y');

		expect(stderr).toContain('install failed; the files are written. To finish: cd my-app && npm install');
		expect(process.exitCode).toBe(1);
		expect(existsSync(join(dir, 'my-app', '.' + 'git'))).toBe(true);
		expect(existsSync(join(dir, 'my-app', 'src/main.ts'))).toBe(true);
		expect(existsSync(join(dir, 'my-app', 'eslint.config.mjs'))).toBe(true);
	}, 120_000);

	it('names the cwd-relative path in the next step, quoting what the shell would split', async () => {
		const dir = await useCwd();

		useDeadRegistry();

		const { stderr } = await runInit(join('apps', 'My App'), '-y');

		expect(stderr).toContain("To finish: cd 'apps/My App' && npm install");
		expect(process.exitCode).toBe(1);
		expect(existsSync(join(dir, 'apps', 'My App', 'src', 'main.ts'))).toBe(true);
	}, 120_000);

	it('asks for the package manager in create mode when the terminal is interactive', async () => {
		await useCwd();

		useDeadRegistry();
		interactivity.enabled = true;
		selectCalls.length = 0;

		const { stderr } = await runInit('my-app');

		expect(selectCalls).toHaveLength(1);
		expect(
			selectCalls[0]?.options.map((option) => {
				return option.value;
			})
		).toEqual(['bun', 'pnpm', 'yarn', 'npm']);
		expect(selectCalls[0]?.initialValue).toBe('npm');

		expect(stderr).toContain('install failed; the files are written. To finish: cd my-app && npm install');
		expect(process.exitCode).toBe(1);
	}, 120_000);

	it('refuses --pm without a folder', async () => {
		await useCwd();

		const { stderr } = await runInit('--pm', 'npm');

		expect(stderr).toContain('--pm only applies when creating a project; here the package manager is detected');
		expect(process.exitCode).toBe(1);
	});

	it('rejects a framework outside the choices at parse time', async () => {
		await useCwd();

		const { stderr } = await runInit('my-app', '--framework', 'vue');

		expect(stderr).toContain("argument 'vue' is invalid");
		expect(stderr).toContain('Allowed choices are');
		expect(process.exitCode).toBe(1);
	});

	it('refuses -f with a folder', async () => {
		await useCwd();

		const { stderr } = await runInit('my-app', '-f');

		expect(stderr).toContain(
			'-f, --force only applies when setting up an existing project; a new project has nothing to replace'
		);
		expect(process.exitCode).toBe(1);
	});

	it('rejects a framework outside the choices and exits 1', async () => {
		await useCwd();

		const { stderr } = await runInit('my-app', '--framework', 'react');

		expect(stderr).toContain('react is not supported yet; only node is');
		expect(process.exitCode).toBe(1);
	});

	it('suggests --dry-run for a misspelled flag and exits 1', async () => {
		const { stderr } = await runInit('--dryrun');

		expect(stderr).toContain("error: unknown option '--dryrun'");
		expect(stderr).toContain('(Did you mean --dry-run?)');
		expect(process.exitCode).toBe(1);
	});

	it('refuses the shared flags on doctor', async () => {
		const program = createProgram({ exitOverride: true });
		let stderr = '';

		await capture(process.stdout, async () => {
			stderr = await capture(process.stderr, () => {
				return runProgram(program, ['node', 'jss-devtools', 'doctor', '--yes']);
			});
		});

		expect(stderr).toContain("error: unknown option '--yes'");
		expect(process.exitCode).toBe(1);
	});
});

describe('the sort failure message', () => {
	it('includes the failing tool stderr, then the finish command', () => {
		expect(
			sortFailureMessage(
				'prettier',
				{
					stdout: '',
					stderr: 'Prettier 3.9.10\n'
				},
				'cd my-app && npm exec prettier --write package.json'
			)
		).toBe(
			'prettier failed; the files are written.\nPrettier 3.9.10\nTo finish: cd my-app && npm exec prettier --write package.json'
		);
	});

	it('falls back to stdout when stderr is empty, and stays on one line without output', () => {
		expect(
			sortFailureMessage(
				'prettier-package-json',
				{
					stdout: 'boom\n',
					stderr: ''
				},
				'npm exec prettier-package-json'
			)
		).toBe('prettier-package-json failed; the files are written.\nboom\nTo finish: npm exec prettier-package-json');
		expect(
			sortFailureMessage(
				'prettier',
				{
					stdout: '',
					stderr: ''
				},
				'npm exec prettier'
			)
		).toBe('prettier failed; the files are written. To finish: npm exec prettier');
	});
});
