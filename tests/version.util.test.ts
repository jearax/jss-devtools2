import { describe, expect, it } from 'vitest';

import { compareVersions, isVersionAtLeast, parseVersion } from '@/core/utils/version.util.js';

describe('parsing a version', () => {
	it('reads the numbers out of a node version', () => {
		expect(parseVersion('v20.11.0')).toEqual({
			major: 20,
			minor: 11,
			patch: 0
		});
	});

	it('reads a version without the v', () => {
		expect(parseVersion('20.11.0')).toEqual({
			major: 20,
			minor: 11,
			patch: 0
		});
	});

	it('returns null for something that is not a version', () => {
		expect(parseVersion('unknown')).toBeNull();
	});
});

describe('comparing two versions', () => {
	it('orders the parts numerically, not as text', () => {
		expect(
			compareVersions(
				{
					major: 20,
					minor: 9,
					patch: 0
				},
				{
					major: 20,
					minor: 11,
					patch: 0
				}
			)
		).toBeLessThan(0);
	});

	it('calls two equal versions equal', () => {
		expect(
			compareVersions(
				{
					major: 20,
					minor: 11,
					patch: 0
				},
				{
					major: 20,
					minor: 11,
					patch: 0
				}
			)
		).toBe(0);
	});
});

describe('a version against a floor', () => {
	it('accepts the floor itself', () => {
		expect(isVersionAtLeast('v20.11.0', '20.11.0')).toBe(true);
	});

	it('accepts a newer version', () => {
		expect(isVersionAtLeast('v21.0.0', '20.11.0')).toBe(true);
	});

	it('refuses an older version', () => {
		expect(isVersionAtLeast('v20.9.0', '20.11.0')).toBe(false);
	});

	it('refuses a version it cannot read', () => {
		expect(isVersionAtLeast('unknown', '20.11.0')).toBe(false);
	});
});
