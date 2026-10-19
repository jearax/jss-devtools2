import { readFileSync } from 'node:fs';

import { defineConfig } from 'tsdown';

import { readPackageInfo } from './scripts/package-info.mjs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
	dependencies?: Record<string, string>;
};

const tsdownConfig = defineConfig({
	entry: ['src/cli.ts'],
	outDir: 'dist',
	format: ['esm'],
	platform: 'node',
	target: 'node24',
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
	inputOptions: {
		onLog: (level, log, handler) => {
			handler(log.code === 'UNRESOLVED_IMPORT' ? 'error' : level, log);
		}
	},
	define: { __JSS_PACKAGE__: JSON.stringify(readPackageInfo()) }
});

export default tsdownConfig;
