import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { createProgram, main, reportFatalError, runProgram } from '@/cli';
import { CliError } from '@/core/errors/cli.error';

import { capture } from './support/capture-stream';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const pkg = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8')) as {
	version: string;
};

const originalExitCode = process.exitCode;
const originalDebug = process.env['JSS_DEBUG'];

afterEach(() => {
	process.exitCode = originalExitCode;

	if (originalDebug === undefined) {
		delete process.env['JSS_DEBUG'];
	} else {
		process.env['JSS_DEBUG'] = originalDebug;
	}
});

describe('cli program', () => {
	it('lists usage and the description in help output', async () => {
		const output = await capture(process.stdout, () => {
			return main(['node', 'jss-devtools', '--help'], { exitOverride: true });
		});

		expect(output).toContain('Usage: jss-devtools');
		expect(output).toContain('JavaScript stack dev tools CLI');
		expect(output).toContain('Output the version number');
		expect(output).toContain('Display help for command');
		expect(process.exitCode).toBe(0);
	});

	it('reports the version injected at build time', async () => {
		const output = await capture(process.stdout, () => {
			return main(['node', 'jss-devtools', '--version'], { exitOverride: true });
		});

		expect(output.trim()).toBe(pkg.version);
		expect(process.exitCode).toBe(0);
	});

	it('names an unknown command and exits non-zero', async () => {
		const output = await capture(process.stderr, () => {
			return main(['node', 'jss-devtools', 'inti'], { exitOverride: true });
		});

		expect(output).toContain("error: unknown command 'inti'");
		expect(output).not.toContain('too many arguments');
		expect(process.exitCode).toBe(1);
	});

	it('shows the help and exits 0 with no command', async () => {
		const output = await capture(process.stdout, () => {
			return main(['node', 'jss-devtools'], { exitOverride: true });
		});

		expect(output).toContain('Usage: jss-devtools');
		expect(process.exitCode).toBe(0);
	});

	it('shows the help of a subcommand and exits 0', async () => {
		const output = await capture(process.stdout, () => {
			return main(['node', 'jss-devtools', 'doctor', '--help'], { exitOverride: true });
		});

		expect(output).toContain('Usage: jss-devtools doctor');
		expect(output).toContain('Check the environment');
		expect(output).toContain('Display help for command');
		expect(process.exitCode).toBe(0);
	});
});

describe('command failures', () => {
	it('renders a CliError with its hint on stderr and exits 1', async () => {
		const program = createProgram({ exitOverride: true });

		program.command('boom').action(() => {
			throw new CliError('the check failed', { hint: 'run it again with --yes' });
		});

		const output = await capture(process.stderr, () => {
			return runProgram(program, ['node', 'jss-devtools', 'boom']);
		});

		expect(output).toContain('the check failed');
		expect(output).toContain('run it again with --yes');
		expect(process.exitCode).toBe(1);
	});

	it('reports an unexpected error on stderr and exits 1', async () => {
		const program = createProgram({ exitOverride: true });

		program.command('boom').action(() => {
			throw new Error('something broke');
		});

		const output = await capture(process.stderr, () => {
			return runProgram(program, ['node', 'jss-devtools', 'boom']);
		});

		expect(output.trim()).toBe('something broke');
		expect(process.exitCode).toBe(1);
	});
});

describe('fatal error reporting', () => {
	it('never turns a crash into exit 0', async () => {
		process.exitCode = 0;

		await capture(process.stderr, () => {
			reportFatalError(new Error('boom'));
		});

		expect(process.exitCode).toBe(1);
	});

	it('writes one line by default and the stack under JSS_DEBUG=1', async () => {
		const plain = await capture(process.stderr, () => {
			reportFatalError(new Error('boom'));
		});

		expect(plain.trim().split('\n')).toEqual(['boom']);

		process.env['JSS_DEBUG'] = '1';

		const debug = await capture(process.stderr, () => {
			reportFatalError(new Error('boom'));
		});

		expect(debug).toContain('at ');
	});

	it('survives a non-Error throw', async () => {
		process.exitCode = 0;

		const output = await capture(process.stderr, () => {
			reportFatalError('plain string');
		});

		expect(output.trim()).toBe('plain string');
		expect(process.exitCode).toBe(1);
	});
});
