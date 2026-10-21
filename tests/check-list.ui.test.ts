import { afterEach, describe, expect, it } from 'vitest';

import { renderCheckList } from '@/core/ui/check-list.ui';

import { capture } from './support/capture-stream';

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
					ok: true,
					detail: 'v24.11.0',
					note: 'needs >= 24.11.0'
				},
				{
					label: 'Git',
					ok: true,
					detail: '2.55.0'
				},
				{
					label: 'Git repository',
					ok: true,
					detail: 'inside a git repository'
				}
			]);
		});

		expect(output).toBe(
			[
				'│  ✔ Node.js         v24.11.0  needs >= 24.11.0',
				'│  ✔ Git             2.55.0',
				'│  ✔ Git repository  inside a git repository',
				''
			].join('\n')
		);
	});

	it('marks a failed check and puts its hint under its row', async () => {
		process.env['NO_COLOR'] = '1';

		const output = await capture(process.stdout, () => {
			renderCheckList([
				{
					label: 'Node.js',
					ok: true,
					detail: 'v24.11.0',
					note: 'needs >= 24.11.0'
				},
				{
					label: 'Git',
					ok: true,
					detail: '2.55.0'
				},
				{
					label: 'Git repository',
					ok: false,
					detail: 'not a git repository',
					hint: 'run `git init`, or cd into a repository'
				}
			]);
		});

		expect(output).toBe(
			[
				'│  ✔ Node.js         v24.11.0  needs >= 24.11.0',
				'│  ✔ Git             2.55.0',
				'│  ✖ Git repository  not a git repository',
				'│    ↳ run `git init`, or cd into a repository',
				''
			].join('\n')
		);
	});

	it('writes no escape byte when the output is not a terminal', async () => {
		process.env['NO_COLOR'] = '1';

		const output = await capture(process.stdout, () => {
			renderCheckList([
				{
					label: 'Git',
					ok: false,
					detail: 'git is not installed'
				}
			]);
		});

		expect(output).not.toContain(ESC);
	});
});
