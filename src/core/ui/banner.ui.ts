import { styleText } from 'node:util';

import { BANNER_ART, PLATFORM_NAMES } from '@/core/constants/banner.constant.js';
import { PACKAGE } from '@/core/constants/package.constant.js';

import { isInteractive, type TerminalContext } from './terminal.ui.js';

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

const ART_COLORS = ['cyan', 'cyan', 'blue', 'blue', 'magenta', 'magenta'] as const;

const INFO_GAP = '   ';

export const renderBanner = ({ name, version, description, node, platform, arch }: BannerInfo): string => {
	const info: Record<number, string> = {
		1: `${name} v${version}`,
		2: styleText('dim', description),
		4: styleText('dim', `node ${node} · ${PLATFORM_NAMES[platform] ?? platform} ${arch}`)
	};

	return BANNER_ART.map((line, index) => {
		const art = styleText(ART_COLORS[index] ?? 'cyan', line);
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
