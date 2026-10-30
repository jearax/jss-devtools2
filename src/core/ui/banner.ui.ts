import { styleText } from 'node:util';

import {
	BANNER_ART,
	DS_PRIMARY_300,
	DS_PRIMARY_400,
	DS_PRIMARY_500,
	PLATFORM_NAMES
} from '@/core/constants/banner.constant';
import { PACKAGE } from '@/core/constants/package.constant';

import { isInteractive, type TerminalContext } from './terminal.ui';

export type BannerInfo = {
	name: string;
	version: string;
	description: string;
	node: string;
	platform: string;
	arch: string;
};

const bannerInfo: BannerInfo = {
	name: PACKAGE.name,
	version: PACKAGE.version,
	description: PACKAGE.description,
	node: process.version,
	platform: process.platform,
	arch: process.arch
};

type Rgb = readonly [number, number, number];

const hexToRgb = (hex: string): Rgb => {
	return [
		Number.parseInt(hex.slice(1, 3), 16),
		Number.parseInt(hex.slice(3, 5), 16),
		Number.parseInt(hex.slice(5, 7), 16)
	];
};

const GRADIENT_STOPS: readonly Rgb[] = [DS_PRIMARY_300, DS_PRIMARY_400, DS_PRIMARY_500].map(hexToRgb);

const SHADOW_CHARACTERS = new Set(['╚', '╔', '╗', '╝', '║', '═']);

const CUBE_STEPS = [0, 95, 135, 175, 215, 255];

const INFO_GAP = '   ';

type ColourStream = {
	isTTY?: boolean;
	getColorDepth?: (env: NodeJS.ProcessEnv) => number;
};

const colorDepth = (env: NodeJS.ProcessEnv, stream: ColourStream): number => {
	return stream.isTTY === true && stream.getColorDepth !== undefined ? stream.getColorDepth(env) : 1;
};

const gradientColour = (column: number, width: number): Rgb => {
	const t = (column / (width - 1)) * (GRADIENT_STOPS.length - 1);
	const index = Math.min(Math.floor(t), GRADIENT_STOPS.length - 2);
	const fraction = t - index;
	const from = GRADIENT_STOPS[index]!;
	const to = GRADIENT_STOPS[index + 1]!;

	return [
		Math.round(from[0] + (to[0] - from[0]) * fraction),
		Math.round(from[1] + (to[1] - from[1]) * fraction),
		Math.round(from[2] + (to[2] - from[2]) * fraction)
	];
};

const nearestCubeIndex = (value: number): number => {
	let best = 0;

	for (let index = 1; index < CUBE_STEPS.length; index += 1) {
		if (Math.abs(CUBE_STEPS[index]! - value) < Math.abs(CUBE_STEPS[best]! - value)) {
			best = index;
		}
	}

	return best;
};

const toXterm256 = (rgb: Rgb): number => {
	const [r, g, b] = rgb;
	const cubeIndex = [r, g, b].map(nearestCubeIndex);

	const cube = cubeIndex.map((channel) => {
		return CUBE_STEPS[channel]!;
	});

	const cubeDistance = [r, g, b].reduce((sum, value, position) => {
		return sum + (value - cube[position]!) ** 2;
	}, 0);

	const grayLevel = Math.min(Math.max(Math.round((r + g + b) / 3 / 10 - 0.8), 0), 23);

	const grayDistance = [r, g, b].reduce((sum, value) => {
		return sum + (value - (8 + grayLevel * 10)) ** 2;
	}, 0);

	return grayDistance < cubeDistance ? 232 + grayLevel : 16 + 36 * cubeIndex[0]! + 6 * cubeIndex[1]! + cubeIndex[2]!;
};

const gradientCode = (rgb: Rgb, depth: number): string => {
	if (depth >= 24) {
		return `38;2;${rgb[0]};${rgb[1]};${rgb[2]}`;
	}

	return `38;5;${toXterm256(rgb)}`;
};

const artLine = (line: string, width: number, depth: number): string => {
	if (depth < 4) {
		return line;
	}

	return [...line]
		.map((character, column) => {
			if (character === ' ') {
				return character;
			}

			const code = depth >= 8 ? gradientCode(gradientColour(column, width), depth) : '35';
			const dim = SHADOW_CHARACTERS.has(character) ? ';2' : '';

			return `\u001b[${code}${dim}m${character}\u001b[0m`;
		})
		.join('');
};

export const renderBanner = (
	{ name, version, description, node, platform, arch }: BannerInfo,
	env: NodeJS.ProcessEnv = process.env,
	stream: ColourStream = process.stdout
): string => {
	const depth = colorDepth(env, stream);

	const widest = Math.max(
		...BANNER_ART.map((line) => {
			return line.length;
		})
	);

	const info: Record<number, string> = {
		1: `${name} v${version}`,
		2: styleText('dim', description),
		4: styleText('dim', `Node.js ${node} · ${PLATFORM_NAMES[platform] ?? platform} ${arch}`)
	};

	return BANNER_ART.map((line, index) => {
		const art = artLine(line, widest, depth);
		const text = info[index];

		return text === undefined ? art : `${art}${INFO_GAP}${text}`;
	}).join('\n');
};

export const bannerText = (): string => {
	return renderBanner(bannerInfo);
};

export const showBanner = (context: TerminalContext = {}): void => {
	if (!isInteractive(context)) {
		return;
	}

	process.stdout.write(`${bannerText()}\n\n`);
};
