/**
 * The JSS block letters in figlet's ANSI Shadow font, generated with `figlet -f "ANSI Shadow" JSS`;
 * the bundle ships without `node_modules`, so figlet cannot run here.
 */
export const BANNER_ART = [
	'     ██╗███████╗███████╗',
	'     ██║██╔════╝██╔════╝',
	'     ██║███████╗███████╗',
	'██   ██║╚════██║╚════██║',
	'╚█████╔╝███████║███████║',
	' ╚════╝ ╚══════╝╚══════╝'
] as const;

export const DS_PRIMARY_300 = '#e1a9d5';
export const DS_PRIMARY_400 = '#cd89bc';
export const DS_PRIMARY_500 = '#ab6496';

export const PLATFORM_NAMES: Record<string, string> = {
	darwin: 'macOS',
	win32: 'Windows',
	linux: 'Linux'
};
