import { styleText } from 'node:util';

import { S_BAR, S_ERROR, S_STEP_SUBMIT } from '@clack/prompts';

import type { TerminalSpinner } from './terminal.ui.js';

const FIRST_FRAME = '◒';

const FRAMES = [FIRST_FRAME, '◐', '◓', '◑'] as const;

const FRAME_DELAY = 80;

/**
 * Clack's spinner registers global process handlers while it runs, and its unhandledRejection
 * handler turns a detached rejection into exit 0, so the frames are drawn here.
 */
export const createAnimatedSpinner = (): TerminalSpinner => {
	let timer: NodeJS.Timeout | undefined;
	let message = '';
	let frame = 0;
	let drawnLines = 1;

	const drawFrame = (symbol: string, text: string): void => {
		const columns = process.stdout.columns;
		// A pty without a window size reports no columns, so 80 stands in.
		const width = columns && columns > 0 ? columns : 80;

		// The length is in code units, so a CJK or emoji message miscounts the wrapped lines.
		drawnLines = Math.max(1, Math.ceil((symbol.length + 2 + text.length) / width));

		process.stdout.write(`${styleText('magenta', symbol)}  ${text}`);
	};

	const erase = (): void => {
		// A cursor up of zero still moves up one line, so it is only written when the frame wrapped.
		const up = drawnLines > 1 ? `\u001b[${drawnLines - 1}A` : '';

		process.stdout.write(`${up}\u001b[1G\u001b[J`);
	};

	const stop = (symbol: string, next: string): void => {
		if (timer) {
			clearInterval(timer);
			timer = undefined;
		}

		erase();
		process.stdout.write(`${symbol}  ${next}\n`);
	};

	return {
		start: (next) => {
			message = next;
			frame = 0;

			process.stdout.write(`${styleText('gray', S_BAR)}\n`);
			drawFrame(FIRST_FRAME, message);

			timer = setInterval(() => {
				erase();
				frame = (frame + 1) % FRAMES.length;

				drawFrame(FRAMES[frame] ?? FIRST_FRAME, message);
			}, FRAME_DELAY);

			timer.unref();
		},
		update: (next) => {
			message = next;
		},
		success: (next) => {
			stop(styleText('green', S_STEP_SUBMIT), next);
		},
		error: (next) => {
			stop(styleText('red', S_ERROR), next);
		}
	};
};
