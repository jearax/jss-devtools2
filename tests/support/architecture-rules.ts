import { readdir, readFile } from 'node:fs/promises';
import { join, posix, relative, resolve, sep } from 'node:path';

export type ArchitectureRule = {
	id: string;
	scope: (logicalPath: string) => boolean;
	pattern?: RegExp;
	check?: (logicalPath: string, content: string) => boolean;
	allow: readonly string[];
	reason: string;
	fixture: string;
};

export type Violation = {
	rule: string;
	file: string;
	reason: string;
};

const SRC_ROOT = 'src/';
const FIXTURE_ROOT = 'tests/fixtures/architecture/src/';
const RUNNER = 'core/utils/run-command.util.ts';

const ROLE_SUFFIXES: readonly (readonly [RegExp, readonly string[]])[] = [
	[/^core\/adapters\//, ['.adapter.ts']],
	[/^core\/constants\//, ['.constant.ts']],
	[/^core\/errors\//, ['.error.ts']],
	[/^core\/ui\//, ['.ui.ts']],
	[/^core\/utils\//, ['.util.ts']],
	[/^commands\/[^/]+\/checks\//, ['.check.ts']],
	[/^commands\/[^/]+\/types\//, ['.type.ts']],
	[/^commands\/[^/]+\//, ['.command.ts', '.service.ts']]
];

const isCommandFile = (logicalPath: string): boolean => {
	return logicalPath.endsWith('.command.ts') || logicalPath === 'cli.ts';
};

const isUiFile = (logicalPath: string): boolean => {
	return logicalPath.endsWith('.ui.ts');
};

const hasRoleSuffix = (logicalPath: string): boolean => {
	const folder = ROLE_SUFFIXES.find(([pattern]) => {
		return pattern.test(logicalPath);
	});

	if (!folder) {
		return false;
	}

	return folder[1].some((suffix) => {
		return logicalPath.endsWith(suffix);
	});
};

const importSpecifiers = (content: string): string[] => {
	return [...content.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((match) => {
		return match[1] ?? '';
	});
};

const logicalTargetOf = (logicalPath: string, specifier: string): string | null => {
	if (specifier.startsWith('@/')) {
		return specifier.slice(2);
	}

	if (!specifier.startsWith('.')) {
		return null;
	}

	const directory = logicalPath.split('/').slice(0, -1);

	return posix.join(...directory, specifier);
};

const importsOtherCommand = (logicalPath: string, content: string): boolean => {
	const segments = logicalPath.split('/');
	const currentCommand = segments[1];

	return importSpecifiers(content).some((specifier) => {
		const target = logicalTargetOf(logicalPath, specifier);

		if (target === null) {
			return false;
		}

		const parts = target.split('/');

		return parts[0] === 'commands' && parts[1] !== currentCommand;
	});
};

// A command that exits the process or installs a global handler can turn a failure into a
// silent success, which is the bug the previous JSS release shipped.
export const rules: readonly ArchitectureRule[] = [
	{
		id: 'file-role-suffix',
		scope: (logicalPath) => {
			return logicalPath !== 'cli.ts';
		},
		check: (logicalPath) => {
			return !hasRoleSuffix(logicalPath);
		},
		allow: [],
		reason: 'every file under src/ carries the suffix that states its role',
		fixture: 'tests/fixtures/architecture/src/core/utils/legacy-helper.ts'
	},
	{
		id: 'core-imports-no-command',
		scope: (logicalPath) => {
			return logicalPath.startsWith('core/');
		},
		pattern: /from\s+['"][^'"]*commands\//,
		allow: [],
		reason: 'src/core is shared and imports no command',
		fixture: 'tests/fixtures/architecture/src/core/utils/imports-command.util.ts'
	},
	{
		id: 'command-imports-no-other-command',
		scope: (logicalPath) => {
			return logicalPath.startsWith('commands/');
		},
		check: importsOtherCommand,
		allow: [],
		reason: 'a command imports nothing from another command',
		fixture: 'tests/fixtures/architecture/src/commands/doctor/imports-other.service.ts'
	},
	{
		id: 'commander-in-command-files-only',
		scope: (logicalPath) => {
			return !isCommandFile(logicalPath);
		},
		pattern: /from\s+['"]commander['"]/,
		allow: [],
		reason: 'commander is wired in *.command.ts and in cli.ts',
		fixture: 'tests/fixtures/architecture/src/commands/doctor/uses-commander.service.ts'
	},
	{
		id: 'clack-in-ui-layer-only',
		scope: (logicalPath) => {
			return !isUiFile(logicalPath) && !isCommandFile(logicalPath);
		},
		pattern: /from\s+['"]@clack\/prompts['"]/,
		allow: [],
		reason: '@clack/prompts is rendered in *.ui.ts, in *.command.ts and in cli.ts',
		fixture: 'tests/fixtures/architecture/src/commands/doctor/uses-clack.service.ts'
	},
	{
		id: 'output-in-ui-layer-only',
		scope: (logicalPath) => {
			return !isUiFile(logicalPath) && !isCommandFile(logicalPath);
		},
		pattern: /\b(?:process\.(?:stdout|stderr)|console\.)/,
		allow: [],
		reason: 'the terminal is written in *.ui.ts, in *.command.ts and in cli.ts',
		fixture: 'tests/fixtures/architecture/src/commands/doctor/writes-output.service.ts'
	},
	{
		id: 'child-process-in-runner-only',
		scope: (logicalPath) => {
			return logicalPath !== RUNNER;
		},
		pattern: /from\s+['"]node:child_process['"]/,
		allow: [],
		reason: 'node:child_process is spawned only by core/utils/run-command.util.ts',
		fixture: 'tests/fixtures/architecture/src/commands/doctor/spawns.service.ts'
	},
	{
		id: 'runner-in-adapters-only',
		scope: (logicalPath) => {
			return !logicalPath.endsWith('.adapter.ts');
		},
		pattern: /from\s+['"][^'"]*run-command\.util(?:\.js)?['"]/,
		allow: [],
		reason: 'the command runner is called only by an adapter',
		fixture: 'tests/fixtures/architecture/src/commands/doctor/uses-runner.service.ts'
	},
	{
		id: 'no-process-exit-outside-entry-point',
		scope: () => {
			return true;
		},
		pattern: /\bprocess\s*\.\s*exit\s*\(/,
		allow: ['cli.ts'],
		reason: 'set process.exitCode in src/cli.ts instead, so failures stay non-zero',
		fixture: 'tests/fixtures/architecture/src/commands/doctor/forbidden-process-exit.service.ts'
	},
	{
		id: 'no-global-process-handlers-outside-entry-point',
		scope: () => {
			return true;
		},
		pattern: /\bprocess\s*\.\s*on\s*\(\s*['"](uncaughtException|unhandledRejection)['"]/,
		allow: ['cli.ts'],
		reason: 'global process handlers live in src/cli.ts and must not swallow failures',
		fixture: 'tests/fixtures/architecture/src/commands/doctor/forbidden-global-handler.service.ts'
	}
];

/** A fixture is judged as if it lived at its mirrored place. */
export const logicalPathOf = (file: string): string => {
	const normalized = file.split(sep).join('/');

	if (normalized.startsWith(FIXTURE_ROOT)) {
		return normalized.slice(FIXTURE_ROOT.length);
	}

	if (normalized.startsWith(SRC_ROOT)) {
		return normalized.slice(SRC_ROOT.length);
	}

	return normalized;
};

export const listSourceFiles = async (dir: string, repoRoot: string): Promise<string[]> => {
	const entries = await readdir(dir, {
		withFileTypes: true,
		recursive: true
	});

	return entries
		.filter((entry) => {
			return entry.isFile() && entry.name.endsWith('.ts');
		})
		.map((entry) => {
			return join(entry.parentPath, entry.name);
		})
		.map((file) => {
			return relative(repoRoot, file).split(sep).join('/');
		})
		.sort();
};

export const findViolations = async (repoRoot: string, files: readonly string[]): Promise<Violation[]> => {
	const violations: Violation[] = [];

	for (const file of files) {
		const logicalPath = logicalPathOf(file);
		const source = await readFile(resolve(repoRoot, file), 'utf8');

		for (const rule of rules) {
			if (!rule.scope(logicalPath) || rule.allow.includes(logicalPath)) {
				continue;
			}

			const broken = rule.pattern ? rule.pattern.test(source) : rule.check?.(logicalPath, source) === true;

			if (broken) {
				violations.push({
					rule: rule.id,
					file,
					reason: rule.reason
				});
			}
		}
	}

	return violations;
};
