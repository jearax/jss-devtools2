import { readFileSync } from 'node:fs';

import { defineConfig } from 'tsdown';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
	version: string;
	dependencies?: Record<string, string>;
};

const tsdownConfig = defineConfig({
	entry: ['src/cli.ts'],
	outDir: 'dist',
	format: ['esm'],
	platform: 'node',
	target: 'node22',
	clean: true,
	dts: false,
	sourcemap: false,
	minify: false,
	banner: { js: '#!/usr/bin/env node' },
	// `tests/bundle.test.ts` is the real guard; `onlyBundle: false` only silences tsdown's hint.
	deps: {
		alwaysBundle: Object.keys(pkg.dependencies ?? {}),
		onlyBundle: false
	},
	define: { __JSS_VERSION__: JSON.stringify(pkg.version) }
});

export default tsdownConfig;
