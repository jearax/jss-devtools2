import { stripVTControlCharacters } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { PACKAGE } from '@/core/constants/package.constant';
import { renderBanner, showBanner } from '@/core/ui/banner.ui';

import { capture } from './support/capture-stream';

const info = {
	name: 'jss-devtools',
	version: '0.0.1',
	description: 'JavaScript stack dev tools',
	node: `v${PACKAGE.nodeFloor}`,
	platform: 'darwin',
	arch: 'arm64'
};

const originalForceColor = process.env['FORCE_COLOR'];

afterEach(() => {
	if (originalForceColor === undefined) {
		delete process.env['FORCE_COLOR'];
	} else {
		process.env['FORCE_COLOR'] = originalForceColor;
	}
});

describe('banner', () => {
	it('lines the info column up on every line it occupies', () => {
		const lines = stripVTControlCharacters(renderBanner(info)).split('\n');

		const columns = [lines[1]?.indexOf(info.name), lines[2]?.indexOf(info.description), lines[4]?.indexOf('node ')];

		expect(columns[0]).toBeGreaterThan(0);
		expect(
			columns.every((column) => {
				return column === columns[0];
			})
		).toBe(true);
	});

	it('shows the name, the version, the description, the node version and the platform', () => {
		const banner = stripVTControlCharacters(renderBanner(info));

		expect(banner).toContain('jss-devtools v0.0.1');
		expect(banner).toContain('JavaScript stack dev tools');
		expect(banner).toContain(`node v${PACKAGE.nodeFloor} · macOS arm64`);
	});

	it('fits in eighty columns', () => {
		const lines = stripVTControlCharacters(renderBanner(info)).split('\n');

		expect(
			Math.max(
				...lines.map((line) => {
					return line.length;
				})
			)
		).toBeLessThanOrEqual(80);
	});

	it('has no escape code when the colour is off', () => {
		process.env['FORCE_COLOR'] = '0';

		expect(renderBanner(info)).not.toContain('\u001b');
	});
});

describe('showing the banner', () => {
	it('writes the banner on a terminal', async () => {
		const output = await capture(process.stdout, () => {
			showBanner({
				isTTY: true,
				env: {}
			});
		});

		expect(output).toContain(`${PACKAGE.name} v${PACKAGE.version}`);
	});

	it('writes nothing when the output is piped', async () => {
		const output = await capture(process.stdout, () => {
			showBanner({
				isTTY: false,
				env: {}
			});
		});

		expect(output).toBe('');
	});

	it('writes nothing under CI', async () => {
		const output = await capture(process.stdout, () => {
			showBanner({
				isTTY: true,
				env: { CI: 'true' }
			});
		});

		expect(output).toBe('');
	});
});
