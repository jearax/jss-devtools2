import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

export type ArchitectureRule = {
	id: string;
	allow: readonly string[];
	pattern: RegExp;
	reason: string;
	/** Ships with the rule so a broken file proves the scanner still detects it. */
	fixture: string;
};

// A feature module that exits the process or installs a global handler can turn a failure into a
// silent success, which is the bug the previous JSS release shipped.
export const rules: readonly ArchitectureRule[] = [
	{
		id: 'no-process-exit-outside-entry-point',
		allow: ['src/cli.ts'],
		pattern: /\bprocess\s*\.\s*exit\s*\(/,
		reason: 'set process.exitCode in src/cli.ts instead, so failures stay non-zero',
		fixture: 'tests/fixtures/architecture/forbidden-process-exit.ts'
	},
	{
		id: 'no-global-process-handlers-outside-entry-point',
		allow: ['src/cli.ts'],
		pattern: /\bprocess\s*\.\s*on\s*\(\s*['"](uncaughtException|unhandledRejection)['"]/,
		reason: 'global process handlers live in src/cli.ts and must not swallow failures',
		fixture: 'tests/fixtures/architecture/forbidden-global-handler.ts'
	}
];

export type Violation = {
	rule: string;
	file: string;
	reason: string;
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
		const source = await readFile(resolve(repoRoot, file), 'utf8');

		for (const rule of rules) {
			if (rule.allow.includes(file)) {
				continue;
			}

			if (rule.pattern.test(source)) {
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
