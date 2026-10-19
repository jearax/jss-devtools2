export type PackageInfo = {
	/** The bin key in package.json, not the npm package name. */
	name: string;
	description: string;
	version: string;
	nodeFloor: string;
};

/** Injected by tsdown (`define`) and by vitest, from `scripts/package-info.mjs`. */
declare const __JSS_PACKAGE__: PackageInfo;

export const PACKAGE = __JSS_PACKAGE__;
