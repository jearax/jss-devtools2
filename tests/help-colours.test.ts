import { styleText, stripVTControlCharacters } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { createProgram, main } from '@/cli';
import { helpTitle } from '@/core/ui/terminal.ui';

import { capture } from './support/capture-stream';

const originalExitCode = process.exitCode;
const originalForceColor = process.env['FORCE_COLOR'];

afterEach(() => {
	process.exitCode = originalExitCode;

	if (originalForceColor === undefined) {
		delete process.env['FORCE_COLOR'];
	} else {
		process.env['FORCE_COLOR'] = originalForceColor;
	}
});

const styleHelpTerm = (term: string): string => {
	return term
		.split(' ')
		.map((word) => {
			return word[0] === '<' || word[0] === '[' ? styleText('dim', word) : styleText('cyan', word);
		})
		.join(' ');
};

const run = async (stream: NodeJS.WriteStream, args: readonly string[]): Promise<string> => {
	return capture(stream, () => {
		return main(['node', 'jss-devtools', ...args], { exitOverride: true });
	});
};

const widths = (program: ReturnType<typeof createProgram>): ReturnType<typeof createProgram> => {
	return program.configureOutput({
		getOutHelpWidth: () => {
			return 40;
		}
	});
};

describe('help colours', () => {
	it('styles titles, terms, placeholders, the values suffix and the example lines when colour is forced', async () => {
		process.env['FORCE_COLOR'] = '1';

		const output = await run(process.stdout, ['init', '--help']);

		const cyan = (text: string): string => {
			return styleText('cyan', text);
		};

		const dimmed = (text: string): string => {
			return styleText('dim', text);
		};

		expect(output).toContain(helpTitle('Usage:'));
		expect(output).toContain(helpTitle('Arguments:'));
		expect(output).toContain(helpTitle('Options:'));
		expect(output).toContain(helpTitle('Examples:'));
		expect(output).toContain(`${helpTitle('Usage:')} ${styleHelpTerm('jss-devtools init [dir] [options]')}`);
		expect(output).toContain(`  ${styleHelpTerm('dir')}                 Folder for a new project`);
		expect(output).toContain(`  ${styleHelpTerm('--pm <name>')}         Package manager for a new project `);
		expect(output).toContain(`  ${styleHelpTerm('--force, -f')}         Replace existing ESLint`);
		expect(output).toContain('\u001b[2m(values: "bun" | "pnpm"\n');
		expect(output).toContain('default: "npm")\u001b[22m');
		expect(output).toContain(dimmed('(init stops and lists them; default: off)'));
		expect(output).toContain(dimmed('(default: off)'));
		expect(output).toContain(`  ${dimmed('$ ')}${cyan('jss-devtools init my-app')}              Create my-app, asking`);
	});

	it('styles the root help titles, the command names and their placeholders when colour is forced', async () => {
		process.env['FORCE_COLOR'] = '1';

		const output = await run(process.stdout, ['--help']);

		expect(output).toContain(helpTitle('Usage:'));
		expect(output).toContain(`${helpTitle('Usage:')} ${styleHelpTerm('jss-devtools [command] [options]')}`);
		expect(output).toContain(helpTitle('Commands:'));
		expect(output).toContain(`  ${styleHelpTerm('doctor')}`);
		expect(output).toContain(`  ${styleHelpTerm('init [dir] [options]')}`);
		expect(output).toContain(`  ${styleHelpTerm('help [command]')}`);
	});

	it('adds no escape byte to any help when there is no colour', async () => {
		delete process.env['FORCE_COLOR'];

		const outputs = [
			await run(process.stdout, ['--help']),
			await run(process.stdout, ['init', '--help']),
			await run(process.stdout, ['doctor', '--help']),
			await run(process.stderr, ['nope'])
		];

		for (const output of outputs) {
			expect(output).not.toContain('\u001b');
		}
	});

	it('wraps identically with and without colour at a narrow width', async () => {
		delete process.env['FORCE_COLOR'];

		const parse = (): Promise<unknown> => {
			return widths(createProgram({ exitOverride: true })).parseAsync(['node', 'jss-devtools', 'init', '--help']);
		};

		const plain = await capture(process.stdout, async () => {
			await parse().catch(() => {
				return undefined;
			});
		});

		process.env['FORCE_COLOR'] = '1';

		const coloured = await capture(process.stdout, async () => {
			await parse().catch(() => {
				return undefined;
			});
		});

		expect(stripVTControlCharacters(coloured)).toBe(plain);
		expect(coloured).not.toBe(plain);
	});
});
