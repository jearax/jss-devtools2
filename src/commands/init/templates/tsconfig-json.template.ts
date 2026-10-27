export const tsconfigJsonTemplate = (): string => {
	const tsconfig = {
		compilerOptions: {
			target: 'ES2023',
			lib: ['ES2023'],
			module: 'esnext',
			moduleResolution: 'bundler',
			paths: {
				'@/*': ['./src/*']
			},
			types: ['node'],
			strict: true,
			noUncheckedIndexedAccess: true,
			noImplicitOverride: true,
			noFallthroughCasesInSwitch: true,
			exactOptionalPropertyTypes: true,
			resolveJsonModule: true,
			allowSyntheticDefaultImports: true,
			esModuleInterop: true,
			isolatedModules: true,
			verbatimModuleSyntax: true,
			forceConsistentCasingInFileNames: true,
			skipLibCheck: true,
			rootDir: 'src',
			outDir: 'dist'
		},
		include: ['src']
	};

	return `${JSON.stringify(tsconfig, null, '\t')}\n`;
};
