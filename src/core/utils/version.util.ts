export type Version = {
	major: number;
	minor: number;
	patch: number;
};

export const parseVersion = (raw: string): Version | null => {
	const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(raw.trim());

	if (!match) {
		return null;
	}

	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3])
	};
};

export const compareVersions = (a: Version, b: Version): number => {
	return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
};

export const isVersionAtLeast = (raw: string, floor: string): boolean => {
	const version = parseVersion(raw);
	const minimum = parseVersion(floor);

	if (!version || !minimum) {
		return false;
	}

	return compareVersions(version, minimum) >= 0;
};
