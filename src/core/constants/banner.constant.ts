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

export const PLATFORM_NAMES: Record<string, string> = {
	darwin: 'macOS',
	win32: 'Windows',
	linux: 'Linux'
};
