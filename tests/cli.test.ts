import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { main, reportFatalError } from '../src/cli.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const pkg = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8')) as {
	version: string;
};

// Swallow the stream so the test does not print what it is asserting on.
const capture = async <T>(stream: NodeJS.WriteStream, fn: () => T | Promise<T>): Promise<string> => {
	const chunks: string[] = [];
	const original = stream.write.bind(stream);

	stream.write = (chunk: string | Uint8Array): boolean => {
		chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());

		return true;
	};

	try {
		await fn();
	} finally {
		stream.write = original;
	}

	return chunks.join('');
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
