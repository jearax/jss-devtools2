export type ConfigNames = {
	files: readonly string[];
	packageJsonKeys: readonly string[];
};

// Names read from the ESLint, Prettier and commitlint docs on 2026-10-27; the legacy ESLint names
// are configFilenames from @eslint/eslintrc, read 2026-10-28.
export const CONFIG_NAMES: Readonly<Record<'eslint' | 'prettier' | 'commitlint', ConfigNames>> = {
	eslint: {
		files: [
			'eslint.config.js',
			'eslint.config.mjs',
			'eslint.config.cjs',
			'eslint.config.ts',
			'eslint.config.mts',
			'eslint.config.cts',
			'.eslintrc.js',
			'.eslintrc.cjs',
			'.eslintrc.yaml',
			'.eslintrc.yml',
			'.eslintrc.json',
			'.eslintrc'
		],
		packageJsonKeys: ['eslintConfig']
	},
	prettier: {
		files: [
			'.prettierrc',
			'.prettierrc.json',
			'.prettierrc.yml',
			'.prettierrc.yaml',
			'.prettierrc.json5',
			'.prettierrc.js',
			'.prettierrc.ts',
			'.prettierrc.mjs',
			'.prettierrc.mts',
			'.prettierrc.cjs',
			'.prettierrc.cts',
			'.prettierrc.toml',
			'prettier.config.js',
			'prettier.config.ts',
			'prettier.config.mjs',
			'prettier.config.mts',
			'prettier.config.cjs',
			'prettier.config.cts'
		],
		packageJsonKeys: ['prettier']
	},
	commitlint: {
		files: [
			'.commitlintrc',
			'.commitlintrc.json',
			'.commitlintrc.yaml',
			'.commitlintrc.yml',
			'.commitlintrc.js',
			'.commitlintrc.cjs',
			'.commitlintrc.mjs',
			'.commitlintrc.ts',
			'.commitlintrc.cts',
			'.commitlintrc.mts',
			'commitlint.config.js',
			'commitlint.config.cjs',
			'commitlint.config.mjs',
			'commitlint.config.ts',
			'commitlint.config.cts',
			'commitlint.config.mts'
		],
		packageJsonKeys: ['commitlint']
	}
};
