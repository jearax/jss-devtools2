import { CONFIG_NAMES } from '@/commands/init/constants/config-name.constant';
import { NODE_PRESET_DEPENDENCIES } from '@/commands/init/constants/node-preset-dependency.constant';
import { formatScript, LINT_STAGED, SHARED_SCRIPTS } from '@/commands/init/templates/package-json.template';

import type { PackageManagerName } from '@/commands/init/templates/package-json.template';

export type PackageJsonMergeInput = {
	pm: PackageManagerName;
	pmVersion: string;
	force: boolean;
};

const ensureTrailingNewline = (raw: string): string => {
	return raw.endsWith('\n') ? raw : `${raw}\n`;
};

export const mergePackageJson = (parsed: Record<string, unknown>, input: PackageJsonMergeInput): string | null => {
	const merged: Record<string, unknown> = { ...parsed };
	let changed = false;

	const scripts =
		typeof merged['scripts'] === 'object' && merged['scripts'] !== null
			? { ...(merged['scripts'] as Record<string, unknown>) }
			: {};

	for (const [name, command] of Object.entries(SHARED_SCRIPTS)) {
		if (scripts[name] === undefined) {
			scripts[name] = command;
			changed = true;
		}
	}

	if (scripts['format'] === undefined) {
		scripts['format'] = formatScript(input.pm);
		changed = true;
	}

	merged['scripts'] = scripts;

	const devDependencies =
		typeof merged['devDependencies'] === 'object' && merged['devDependencies'] !== null
			? { ...(merged['devDependencies'] as Record<string, unknown>) }
			: {};

	for (const [name, version] of Object.entries(NODE_PRESET_DEPENDENCIES)) {
		if (devDependencies[name] === undefined) {
			devDependencies[name] = `^${version}`;
			changed = true;
		}
	}

	merged['devDependencies'] = devDependencies;

	if (merged['lint-staged'] === undefined) {
		merged['lint-staged'] = LINT_STAGED;
		changed = true;
	}

	if (merged['packageManager'] === undefined) {
		merged['packageManager'] = `${input.pm}@${input.pmVersion}`;
		changed = true;
	}

	if (input.force) {
		for (const tool of ['prettier', 'commitlint'] as const) {
			for (const key of CONFIG_NAMES[tool].packageJsonKeys) {
				if (merged[key] !== undefined) {
					delete merged[key];
					changed = true;
				}
			}
		}
	}

	if (!changed) {
		return null;
	}

	return `${JSON.stringify(merged, null, '\t')}\n`;
};

export const mergeLines = (raw: string, fresh: string): string | null => {
	const existingLines = raw.split('\n');

	const missing = fresh.split('\n').filter((line) => {
		return !existingLines.includes(line);
	});

	if (missing.length === 0) {
		return null;
	}

	return `${ensureTrailingNewline(raw)}${missing.join('\n')}\n`;
};

export const mergeHook = (raw: string, command: string): string | null => {
	if (raw.split('\n').includes(command)) {
		return null;
	}

	return `${ensureTrailingNewline(raw)}${command}\n`;
};
