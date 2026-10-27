import { NODE_PRESET_DEPENDENCIES } from '@/commands/init/constants/node-preset-dependency.constant';

export type PackageManagerName = 'npm' | 'pnpm' | 'yarn' | 'bun';

export type PackageJsonTemplateInput = {
	projectName: string;
	packageManager: PackageManagerName;
	packageManagerVersion: string;
	nodeFloor: string;
};

export const RUN_COMMAND: Readonly<Record<PackageManagerName, string>> = {
	npm: 'npm run',
	pnpm: 'pnpm',
	yarn: 'yarn',
	bun: 'bun run'
};

export const SHARED_SCRIPTS = {
	typecheck: 'tsc --noEmit',
	lint: 'eslint "{src,lib{,s},bin{,s},script{,s},tool{,s},config{,s},type{,s},test{,s},__test{s,}__,spec{,s},e2e}/**/*.{cjs,mjs,js,jsx,cts,mts,ts,tsx}" "*.{cjs,mjs,js,jsx,cts,mts,ts,tsx}"',
	'lint:fix':
		'eslint --fix "{src,lib{,s},bin{,s},script{,s},tool{,s},config{,s},type{,s},test{,s},__test{s,}__,spec{,s},e2e}/**/*.{cjs,mjs,js,jsx,cts,mts,ts,tsx}" "*.{cjs,mjs,js,jsx,cts,mts,ts,tsx}"',
	prepare: 'husky'
} as const;

export const formatScript = (packageManager: PackageManagerName): string => {
	return `${RUN_COMMAND[packageManager]} lint:fix && prettier --write .`;
};

export const LINT_STAGED = {
	'{{src,lib{,s},bin{,s},script{,s},tool{,s},config{,s},type{,s},test{,s},__test{s,}__,spec{,s},e2e}/**/*,*}.{cjs,mjs,js,jsx,cts,mts,ts,tsx}':
		['eslint --fix', 'prettier --write'],
	'!(package).json': ['prettier --write'],
	'**/*.{md,yml,yaml}': ['prettier --write'],
	'package.json': ['prettier-package-json --write', 'prettier --write']
} as const;

export const packageJsonTemplate = ({
	projectName,
	packageManager,
	packageManagerVersion,
	nodeFloor
}: PackageJsonTemplateInput): string => {
	const devDependencies = Object.fromEntries(
		Object.entries(NODE_PRESET_DEPENDENCIES).map(([name, version]) => {
			return [name, `^${version}`];
		})
	);

	const manifest = {
		name: projectName,
		version: '0.0.0',
		private: true,
		type: 'module',
		engines: {
			node: `>=${nodeFloor}`
		},
		packageManager: `${packageManager}@${packageManagerVersion}`,
		scripts: {
			dev: 'tsx watch src/main.ts',
			build: 'tsc && tsc-alias --resolve-full-paths',
			start: 'node dist/main.js',
			typecheck: SHARED_SCRIPTS.typecheck,
			lint: SHARED_SCRIPTS.lint,
			'lint:fix': SHARED_SCRIPTS['lint:fix'],
			format: formatScript(packageManager),
			prepare: SHARED_SCRIPTS.prepare
		},
		'lint-staged': LINT_STAGED,
		devDependencies
	};

	return `${JSON.stringify(manifest, null, '\t')}\n`;
};
