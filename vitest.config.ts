import { readFileSync } from 'node:fs';

import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
	version: string;
};

const vitestConfig = defineConfig({
	define: {
		__JSS_VERSION__: JSON.stringify(pkg.version)
	},
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts'],
		globalSetup: ['tests/setup/global-setup.ts']
	}
});

export default vitestConfig;
