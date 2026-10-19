import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { findViolations, listSourceFiles, rules } from './support/architecture-rules.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('architecture rules', () => {
	it('finds no violation in the real src tree', async () => {
		const files = await listSourceFiles(resolve(repoRoot, 'src'), repoRoot);

		expect(files.length).toBeGreaterThan(0);
		expect(await findViolations(repoRoot, files)).toEqual([]);
	});

	it.each(
		rules.map((rule) => {
			return [rule.id, rule.fixture] as const;
		})
	)('detects %s from its fixture', async (id, fixture) => {
		const violations = await findViolations(repoRoot, [fixture]);

		expect(violations).toEqual([
			expect.objectContaining({
				rule: id,
				file: fixture
			})
		]);
	});

	it('has one fixture per rule', () => {
		expect(
			new Set(
				rules.map((rule) => {
					return rule.fixture;
				})
			).size
		).toBe(rules.length);
	});
});

describe('the alias in the scanner', () => {
	const rule = rules.find((entry) => {
		return entry.id === 'command-imports-no-other-command';
	});

	it('sees an aliased import of another command', () => {
		const broken = rule?.check?.(
			'commands/doctor/doctor.service.ts',
			"import { other } from '@/commands/other/other.service.js';"
		);

		expect(broken).toBe(true);
	});

	it('leaves an aliased import of core alone', () => {
		const broken = rule?.check?.(
			'commands/doctor/doctor.service.ts',
			"import { PACKAGE } from '@/core/constants/package.constant.js';"
		);

		expect(broken).toBe(false);
	});
});
