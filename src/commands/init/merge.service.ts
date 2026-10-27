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

export type PnpmWorkspaceMerge =
	{ action: 'merged'; content: string } | { action: 'unchanged' } | { action: 'unmergeable' };

const WORKSPACE_BUILDS = ['esbuild', 'unrs-resolver'] as const;

// pnpm 11 writes this after a failed install; it is a prompt to choose, not a value the user set.
const PLACEHOLDER = 'set this to true or false';

// Line-based on purpose: the merge must keep the user's bytes and the template layout is fixed.
export const mergePnpmWorkspaceYaml = (raw: string): PnpmWorkspaceMerge => {
	const lines = raw.split('\n');

	const allowLine = lines.findIndex((line) => {
		return line.startsWith('allowBuilds:');
	});

	if (allowLine !== -1 && !/^allowBuilds:\s*$/.test(lines[allowLine] ?? '')) {
		return { action: 'unmergeable' };
	}

	const children = new Map<string, { line: number; indent: string; placeholder: boolean }>();
	let insertAfter = allowLine;

	if (allowLine !== -1) {
		for (let i = allowLine + 1; i < lines.length; i++) {
			const line = lines[i] ?? '';

			if (line.trim() === '') {
				continue;
			}

			if (!/^\s/.test(line)) {
				break;
			}

			const match = /^(\s+)([A-Za-z0-9.-]+):(?:[ \t]+(.*))?/.exec(line);
			const indent = match?.[1];
			const key = match?.[2];

			if (indent === undefined || key === undefined) {
				continue;
			}

			children.set(key, {
				line: i,
				indent,
				placeholder: match?.[3] === PLACEHOLDER
			});
			insertAfter = i;
		}
	}

	const missing = WORKSPACE_BUILDS.filter((name) => {
		const child = children.get(name);

		return child === undefined || child.placeholder;
	});

	if (missing.length === 0) {
		return { action: 'unchanged' };
	}

	const merged = [...lines];

	for (const name of missing) {
		const child = children.get(name);

		if (child !== undefined) {
			merged[child.line] = `${child.indent}${name}: true`;
		}
	}

	const appended = missing.filter((name) => {
		return !children.has(name);
	});

	if (appended.length > 0) {
		const indent = children.values().next().value?.indent ?? '  ';

		const added = appended.map((name) => {
			return `${indent}${name}: true`;
		});

		if (allowLine === -1) {
			merged.splice(
				lines.findLastIndex((line) => {
					return line.trim() !== '';
				}) + 1,
				0,
				'allowBuilds:',
				...added
			);
		} else {
			merged.splice(insertAfter + 1, 0, ...added);
		}
	}

	const content = `${merged.join('\n').replace(/\n*$/, '')}\n`;

	return {
		action: 'merged',
		content
	};
};
