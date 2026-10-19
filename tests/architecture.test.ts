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
