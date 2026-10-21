import { afterEach, describe, expect, it } from 'vitest';

import { createProgram, runProgram } from '@/cli';

import { capture } from './support/capture-stream';

import type { Command } from 'commander';

const HELP_BLOCK = `Usage: jss-devtools init [options]

initialize a project

Options:
  -y, --yes   do not ask; take the default answers
  --dry-run   show the changes, write nothing
  -h, --help  display help for command

Examples:
  $ jss-devtools init              ask before writing
  $ jss-devtools init --dry-run    show what would change
  $ jss-devtools init --yes        write without asking, e.g. in CI
`;

const originalExitCode = process.exitCode;

afterEach(() => {
	process.exitCode = originalExitCode;
});

// A subcommand copies the exit override when it is created, so the root's later override never reaches it.
const createTestProgram = (): Command => {
	const program = createProgram({ exitOverride: true });

	for (const command of program.commands) {
		command.exitOverride();
	}

	return program;
};

const runInit = async (...args: readonly string[]): Promise<{ stdout: string; stderr: string }> => {
	const program = createTestProgram();
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

describe('the init command', () => {
	it('prints its help exactly as documented', async () => {
		const { stdout } = await runInit('--help');

		expect(stdout).toBe(HELP_BLOCK);
		expect(process.exitCode).toBe(0);
	});

	const runs = [
		{
			name: 'with no flag',
			args: []
		},
		{
			name: 'with --yes',
			args: ['-y']
		},
		{
			name: 'with --dry-run',
			args: ['--dry-run']
		},
		{
			name: 'with --yes and --dry-run',
			args: ['-y', '--dry-run']
		}
	];

	it.each(runs)('$name, it ends with "Nothing to set up" and exits 0', async ({ args }) => {
		const { stdout } = await runInit(...args);

		expect(stdout.trimEnd().endsWith('Nothing to set up')).toBe(true);
		expect(process.exitCode ?? 0).toBe(0);
	});

	it('suggests --dry-run for a misspelled flag and exits 1', async () => {
		const { stderr } = await runInit('--dryrun');

		expect(stderr).toContain("error: unknown option '--dryrun'");
		expect(stderr).toContain('(Did you mean --dry-run?)');
		expect(process.exitCode).toBe(1);
	});

	it('refuses the shared flags on doctor', async () => {
		const program = createTestProgram();
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
