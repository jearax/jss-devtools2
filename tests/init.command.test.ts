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
  --force, -f         Replace the config files init owns when they already
                      exist, and delete their other names (init stops and lists
                      them; default: off)
  --no-vscode         Do not write .vscode/ (default: written)
  --yes, -y           Do not ask; take the default answers (ask in a terminal;
                      default: off)
  --dry-run           Show the files that would change, write and install
                      nothing (default: off)
  --help, -h          Display help for command

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

const runCli = async (...args: readonly string[]): Promise<{ stdout: string; stderr: string }> => {
	const program = createProgram({ exitOverride: true });
	let stderr = '';

	const stdout = await capture(process.stdout, async () => {
		stderr = await capture(process.stderr, () => {
			return runProgram(program, ['node', 'jss-devtools', ...args]);
		});
	});

	return {
		stdout,
		stderr
	};
};

const runInit = async (...args: readonly string[]): Promise<{ stdout: string; stderr: string }> => {
	return runCli('init', ...args);
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

	it('prints the plan with a counted heading and ends a dry run without a count', async () => {
		const dir = await useCwd();

		await setupExistingProject(dir);

		const { stdout } = await runInit('--dry-run');

		expect(stdout).toContain(': 10 to create, 1 to update');
		expect(stdout).toContain('+ .prettierrc.json');
		expect(stdout).toContain('Dry run: nothing written');
		expect(stdout).not.toContain('would be written');
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

		expect(stderr).toContain('install failed; the files are written');
		expect(stderr).toContain('To finish:');
		expect(stderr).toContain('$ npm install');
		expect(stderr).not.toContain('$ cd');
		expect(stderr).not.toContain('\u001b');
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

		expect(stderr).toContain('install failed; the files are written');
		expect(stderr).toContain('$ cd my-app');
		expect(stderr).toContain('$ npm install');
		expect(stderr).not.toContain('\u001b');
		expect(process.exitCode).toBe(1);
		expect(existsSync(join(dir, 'my-app', '.' + 'git'))).toBe(true);
		expect(existsSync(join(dir, 'my-app', 'src/main.ts'))).toBe(true);
		expect(existsSync(join(dir, 'my-app', 'eslint.config.mjs'))).toBe(true);
	}, 120_000);

	it('names the cwd-relative path in the next step, quoting what the shell would split', async () => {
		const dir = await useCwd();

		useDeadRegistry();

		const { stderr } = await runInit(join('apps', 'My App'), '-y');

		expect(stderr).toContain("cd 'apps/My App'");
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

		expect(stderr).toContain('install failed; the files are written');
		expect(stderr).toContain('$ cd my-app');
		expect(stderr).toContain('$ npm install');
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
			'--force, -f only applies when setting up an existing project; a new project has nothing to replace'
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

	it('refuses --force with a folder when it is spelled long', async () => {
		await useCwd();

		const { stderr } = await runInit('my-app', '--force');

		expect(stderr).toContain(
			'--force, -f only applies when setting up an existing project; a new project has nothing to replace'
		);
		expect(process.exitCode).toBe(1);
	});

	it('runs a dry run with --yes long form without a terminal', async () => {
		const dir = await useCwd();

		await setupExistingProject(dir);

		const before = snapshotDir(dir);

		const { stdout } = await runInit('--yes', '--dry-run');

		expect(stdout).toContain('Dry run: nothing written');
		expect(snapshotDir(dir)).toBe(before);
	});

	it('prints the same help for --help and -h', async () => {
		const { stdout: long } = await runCli('--help');
		const { stdout: short } = await runCli('-h');

		expect(long).toContain('Usage: jss-devtools');
		expect(short).toBe(long);
	});

	it('prints the same version for --version and -v', async () => {
		const { stdout: long } = await runCli('--version');
		const { stdout: short } = await runCli('-v');

		expect(long.trim()).toMatch(/^\d+\.\d+\.\d+$/);
		expect(short).toBe(long);
	});

	it('puts default last in every help parenthesis', async () => {
		for (const args of [['--help'], ['doctor', '--help'], ['init', '--help']]) {
			const { stdout } = await runCli(...args);
			const groups = stdout.match(/\([^()]*\)/g) ?? [];

			for (const group of groups) {
				if (!group.includes('default:')) {
					continue;
				}

				expect(group).toMatch(/default: [^;)]*\)$/);
			}
		}
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
	it('includes the failing tool stderr', () => {
		expect(
			sortFailureMessage('prettier', {
				stdout: '',
				stderr: 'Prettier 3.9.10\n'
			})
		).toBe('prettier failed; the files are written\nPrettier 3.9.10');
	});

	it('falls back to stdout when stderr is empty, and stays on one line without output', () => {
		expect(
			sortFailureMessage('prettier-package-json', {
				stdout: 'boom\n',
				stderr: ''
			})
		).toBe('prettier-package-json failed; the files are written\nboom');
		expect(
			sortFailureMessage('prettier', {
				stdout: '',
				stderr: ''
			})
		).toBe('prettier failed; the files are written');
	});
});
