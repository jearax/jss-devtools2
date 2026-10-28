import { afterEach, describe, expect, it } from 'vitest';

import { renderCheckList } from '@/core/ui/check-list.ui';

import { capture } from './support/capture-stream';

import type { CheckListRow } from '@/core/ui/check-list.ui';

const ESC = '\u001b';

const originalNoColor = process.env['NO_COLOR'];

afterEach(() => {
	if (originalNoColor === undefined) {
		delete process.env['NO_COLOR'];
	} else {
		process.env['NO_COLOR'] = originalNoColor;
	}
});

describe('the check list', () => {
	it('aligns the labels and writes the note beside the detail', async () => {
		process.env['NO_COLOR'] = '1';

		const output = await capture(process.stdout, () => {
			renderCheckList([
				{
					label: 'Node.js',
					status: 'ok',
					detail: 'v24.11.0',
					note: 'needs >= 24.11.0'
				},
				{
					label: 'Git',
					status: 'ok',
					detail: '2.55.0'
				},
				{
					label: 'bun',
					status: 'ok',
					detail: '1.3.8'
				}
			]);
		});

		expect(output).toBe(
			['│  ✔ Node.js  v24.11.0  needs >= 24.11.0', '│  ✔ Git      2.55.0', '│  ✔ bun      1.3.8', ''].join('\n')
		);
	});

	it('marks a failed check and puts its hint under its row', async () => {
		process.env['NO_COLOR'] = '1';

		const output = await capture(process.stdout, () => {
			renderCheckList([
				{
					label: 'Git',
					status: 'fail',
					detail: 'Git is not installed',
					hint: 'Install git, then run the command again'
				},
				{
					label: 'Package manager',
					status: 'fail',
					detail: 'none found'
				}
			]);
		});

		expect(output).toBe(
			[
				'│  ✖ Git              Git is not installed',
				'│    ↳ Install git, then run the command again',
				'│  ✖ Package manager  none found',
				''
			].join('\n')
		);
	});

	it('draws an info row dim with a dash instead of a pass or fail mark', async () => {
		process.env['NO_COLOR'] = '1';

		const output = await capture(process.stdout, () => {
			renderCheckList([
				{
					label: 'Git',
					status: 'ok',
					detail: '2.55.0'
				},
				{
					label: 'yarn',
					status: 'info',
					detail: '4.5.0',
					note: 'init supports yarn 1 only'
				},
				{
					label: 'npm',
					status: 'info',
					detail: 'not installed'
				}
			]);
		});

		expect(output).toBe(
			['│  ✔ Git   2.55.0', '│  – yarn  4.5.0  init supports yarn 1 only', '│  – npm   not installed', ''].join('\n')
		);
	});

	it('writes no escape byte when the output is not a terminal', async () => {
		process.env['NO_COLOR'] = '1';

		const output = await capture(process.stdout, () => {
			const rows: readonly CheckListRow[] = [
				{
					label: 'Git',
					status: 'fail',
					detail: 'Git is not installed'
				}
			];

			renderCheckList(rows);
		});

		expect(output).not.toContain(ESC);
	});
});
