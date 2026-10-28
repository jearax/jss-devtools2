import { styleText } from 'node:util';

import { log } from '@clack/prompts';

export type CheckStatus = 'ok' | 'fail' | 'info';

export type CheckListRow = {
	label: string;
	status: CheckStatus;
	detail: string;
	note?: string;
	hint?: string;
};

export const renderCheckList = (rows: readonly CheckListRow[]): void => {
	const width = rows.reduce((longest, row) => {
		return Math.max(longest, row.label.length);
	}, 0);

	const lines = rows.flatMap((row) => {
		const mark =
			row.status === 'ok'
				? styleText('green', '✔')
				: row.status === 'fail'
					? styleText('red', '✖')
					: styleText('dim', '–');

		const detail = row.status === 'ok' ? row.detail : styleText(row.status === 'fail' ? 'red' : 'dim', row.detail);

		const note = row.note === undefined ? '' : `  ${styleText('dim', row.note)}`;
		const hint = row.hint === undefined ? [] : [`  ${styleText('yellow', `↳ ${row.hint}`)}`];

		return [`${mark} ${row.label.padEnd(width)}  ${detail}${note}`, ...hint];
	});

	log.message(lines, { spacing: 0 });
};
