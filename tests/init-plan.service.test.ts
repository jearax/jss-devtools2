import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { NODE_PRESET_DEPENDENCIES } from '@/commands/init/constants/node-preset-dependency.constant';
import { buildInitPlan, renderPlan } from '@/commands/init/plan.service';
import { eslintConfigMjsTemplate } from '@/commands/init/templates/eslint-config-mjs.template';
import { LINT_STAGED } from '@/commands/init/templates/package-json.template';
import { pnpmWorkspaceYamlTemplate } from '@/commands/init/templates/pnpm-workspace-yaml.template';
import { localBinCommandLine } from '@/core/adapters/package-manager.adapter';

import { makeEmptyDir, removeDir } from './support/tmp-dir';

const dirs: string[] = [];

afterEach(async () => {
	for (const dir of dirs.splice(0)) {
		await removeDir(dir);
	}
});

const makeProject = async (files: Record<string, string>): Promise<string> => {
	const dir = await makeEmptyDir();

	dirs.push(dir);

	for (const [name, content] of Object.entries(files)) {
		const full = join(dir, name);

		await mkdir(dirname(full), { recursive: true });
		await writeFile(full, content);
	}

	return dir;
};

const createPreflight = (targetDir: string) => {
	return {
		mode: 'create' as const,
		targetDir,
		projectName: 'my-app',
		pm: 'npm' as const,
		pmVersion: '11.10.0'
	};
};

const existingPreflight = (dir: string, raw: string) => {
	return {
		mode: 'existing' as const,
		targetDir: dir,
		projectName: 'x',
		pm: 'npm' as const,
		pmVersion: '11.10.0',
		packageJson: {
			parsed: JSON.parse(raw) as Record<string, unknown>
		}
	};
};

const BASIC_PACKAGE_JSON =
	'{"name":"x","version":"0.0.0","scripts":{"start":"node index.js"},"devDependencies":{"left-pad":"^1.0.0"}}';

const BASIC_EXISTING = {
	'package.json': BASIC_PACKAGE_JSON,
	'tsconfig.json': '{}\n'
};

const entryFor = (plan: ReturnType<typeof buildInitPlan>, path: string) => {
	return plan.entries.find((entry) => {
		return entry.path === path;
	});
};

describe('the plan, create mode', () => {
	it('plans every node-preset file, and pnpm-workspace.yaml only for pnpm', () => {
		const npmPlan = buildInitPlan(createPreflight('/tmp/nowhere'), {});

		expect(
			npmPlan.entries.map((entry) => {
				return entry.path;
			})
		).toEqual([
			'package.json',
			'tsconfig.json',
			'src/main.ts',
			'eslint.config.mjs',
			'.prettierrc.json',
			'.editorconfig',
			'.gitignore',
			'.prettierignore',
			'commitlint.config.mjs',
			'.husky/pre-commit',
			'.husky/commit-msg',
			'.vscode/settings.json',
			'.vscode/extensions.json'
		]);

		const pnpmPlan = buildInitPlan(
			{
				...createPreflight('/tmp/nowhere'),
				pm: 'pnpm'
			},
			{}
		);

		expect(pnpmPlan.entries.at(-1)).toEqual({
			action: 'create',
			path: 'pnpm-workspace.yaml',
			content: pnpmWorkspaceYamlTemplate()
		});
	});

	it('plans no vscode files with --no-vscode', () => {
		const plan = buildInitPlan(createPreflight('/tmp/nowhere'), { noVscode: true });

		expect(
			plan.entries.some((entry) => {
				return entry.path.startsWith('.vscode/');
			})
		).toBe(false);
	});

	it('writes the packageManager field from the preflight', () => {
		const plan = buildInitPlan(createPreflight('/tmp/nowhere'), {});

		expect(entryFor(plan, 'package.json')?.content).toContain('"packageManager": "npm@11.10.0"');
	});

	it('writes the hook lines the package manager resolves', () => {
		const plan = buildInitPlan(
			{
				...createPreflight('/tmp/nowhere'),
				pm: 'yarn'
			},
			{}
		);

		expect(entryFor(plan, '.husky/pre-commit')?.content).toBe(
			`#!/usr/bin/env sh\n${localBinCommandLine('yarn', 'lint-staged', [])}\n`
		);
	});
});

describe('the plan, existing mode', () => {
	it('adds the shared scripts, keeps the user scripts, and never adds dev, build or start', async () => {
		const dir = await makeProject(BASIC_EXISTING);
		const plan = buildInitPlan(existingPreflight(dir, BASIC_PACKAGE_JSON), {});
		const entry = entryFor(plan, 'package.json');

		expect(entry?.action).toBe('update');
		const merged = JSON.parse(entry?.content ?? '{}') as { scripts: Record<string, string> };

		expect(merged.scripts['start']).toBe('node index.js');
		expect(merged.scripts['dev']).toBeUndefined();
		expect(merged.scripts['build']).toBeUndefined();
		expect(merged.scripts['typecheck']).toBe('tsc --noEmit');
		expect(merged.scripts['lint']).toContain('eslint');
		expect(merged.scripts['lint:fix']).toContain('eslint --fix');
		expect(merged.scripts['format']).toBe('npm run lint:fix && prettier --write .');
		expect(merged.scripts['prepare']).toBe('husky');
	});

	it('merges devDependencies per package, adds lint-staged and packageManager only when absent', async () => {
		const packageJson =
			'{"name":"x","devDependencies":{"left-pad":"^1.0.0","eslint":"9.0.0"},"packageManager":"yarn@1.22.0"}';

		const dir = await makeProject({
			'package.json': packageJson,
			'tsconfig.json': '{}\n'
		});

		const plan = buildInitPlan(existingPreflight(dir, packageJson), {});

		const merged = JSON.parse(entryFor(plan, 'package.json')?.content ?? '{}') as {
			devDependencies: Record<string, string>;
			'lint-staged': Record<string, unknown>;
			packageManager: string;
		};

		expect(merged.devDependencies['left-pad']).toBe('^1.0.0');
		expect(merged.devDependencies['eslint']).toBe('9.0.0');
		expect(merged.devDependencies['prettier']).toBe(`^${NODE_PRESET_DEPENDENCIES['prettier']}`);
		expect(merged['lint-staged']).toBeDefined();
		expect(merged.packageManager).toBe('yarn@1.22.0');
	});

	it('plans an update only when the merge changes the file, even with a different indent', async () => {
		const packageJson =
			JSON.stringify(
				{
					name: 'x',
					scripts: {
						typecheck: 'tsc --noEmit',
						lint: 'eslint "{src,lib{,s},bin{,s},script{,s},tool{,s},config{,s},type{,s},test{,s},__test{s,}__,spec{,s},e2e}/**/*.{cjs,mjs,js,jsx,cts,mts,ts,tsx}" "*.{cjs,mjs,js,jsx,cts,mts,ts,tsx}"',
						'lint:fix':
							'eslint --fix "{src,lib{,s},bin{,s},script{,s},tool{,s},config{,s},type{,s},test{,s},__test{s,}__,spec{,s},e2e}/**/*.{cjs,mjs,js,jsx,cts,mts,ts,tsx}" "*.{cjs,mjs,js,jsx,cts,mts,ts,tsx}"',
						format: 'npm run lint:fix && prettier --write .',
						prepare: 'husky'
					},
					devDependencies: Object.fromEntries(
						Object.entries(NODE_PRESET_DEPENDENCIES).map(([name, version]) => {
							return [name, `^${version}`];
						})
					),
					'lint-staged': LINT_STAGED,
					packageManager: 'npm@11.10.0'
				},
				null,
				'  '
			) + '\n';

		const dir = await makeProject({
			'package.json': packageJson,
			'tsconfig.json': '{}\n'
		});

		const plan = buildInitPlan(existingPreflight(dir, packageJson), {});
		const packageEntry = entryFor(plan, 'package.json');

		expect(packageEntry).toBeUndefined();
	});

	it('appends the missing .gitignore and .prettierignore lines', async () => {
		const dir = await makeProject({
			...BASIC_EXISTING,
			'.gitignore': 'node_modules/\n*.log\n',
			'.prettierignore': ''
		});

		const plan = buildInitPlan(existingPreflight(dir, BASIC_PACKAGE_JSON), {});

		const merged = entryFor(plan, '.gitignore')?.content ?? '';

		expect(merged.startsWith('node_modules/\n*.log\n')).toBe(true);
		expect(merged).toContain('dist/');
		expect(merged).toContain('.env*');
		expect(merged.endsWith('\n')).toBe(true);
		expect(entryFor(plan, '.prettierignore')?.action).toBe('update');
		expect(entryFor(plan, '.prettierignore')?.content).toContain('package-lock.json');
	});

	it('adds the hook line once and keeps the user lines', async () => {
		const command = localBinCommandLine('npm', 'lint-staged', []);

		const dir = await makeProject({
			...BASIC_EXISTING,
			'.husky/pre-commit': `#!/usr/bin/env sh\necho custom\nnpm test\n`
		});

		const plan = buildInitPlan(existingPreflight(dir, BASIC_PACKAGE_JSON), {});
		const entry = entryFor(plan, '.husky/pre-commit');

		expect(entry?.action).toBe('update');
		expect(entry?.content).toBe(`#!/usr/bin/env sh\necho custom\nnpm test\n${command}\n`);
	});

	it('drops a hook entry when the command line is already there', async () => {
		const command = localBinCommandLine('npm', 'lint-staged', []);

		const files = {
			...BASIC_EXISTING,
			'.husky/pre-commit': `#!/usr/bin/env sh\n${command}\n`
		};

		const dir = await makeProject(files);
		const plan = buildInitPlan(existingPreflight(dir, BASIC_PACKAGE_JSON), {});

		expect(entryFor(plan, '.husky/pre-commit')).toBeUndefined();
	});

	it('never plans tsconfig.json, src/main.ts or pnpm-workspace.yaml in existing mode', async () => {
		const dir = await makeProject(BASIC_EXISTING);
		const plan = buildInitPlan(existingPreflight(dir, BASIC_PACKAGE_JSON), {});

		const paths = plan.entries.map((entry) => {
			return entry.path;
		});

		expect(paths).not.toContain('tsconfig.json');
		expect(paths).not.toContain('src/main.ts');
		expect(paths).not.toContain('pnpm-workspace.yaml');
	});

	it('creates the owned configs when absent and replaces them when present', async () => {
		const dir = await makeProject({
			...BASIC_EXISTING,
			'eslint.config.mjs': 'old\n'
		});

		const plan = buildInitPlan(existingPreflight(dir, BASIC_PACKAGE_JSON), {});

		expect(entryFor(plan, 'eslint.config.mjs')).toEqual({
			action: 'update',
			path: 'eslint.config.mjs',
			content: eslintConfigMjsTemplate()
		});
		expect(entryFor(plan, '.editorconfig')?.action).toBe('create');
		expect(entryFor(plan, 'commitlint.config.mjs')?.action).toBe('create');
	});

	it('deletes the other config names and removes the package.json keys with -f', async () => {
		const packageJson =
			'{"name":"x","prettier":{"singleQuote":true},"commitlint":{"extends":["@commitlint/config-conventional"]}}';

		const dir = await makeProject({
			'package.json': packageJson,
			'tsconfig.json': '{}\n',
			'eslint.config.js': 'old\n',
			'.prettierrc.yml': 'x\n',
			'.commitlintrc.json': '{}\n'
		});

		const plan = buildInitPlan(existingPreflight(dir, packageJson), { force: true });
		const merged = JSON.parse(entryFor(plan, 'package.json')?.content ?? '{}') as Record<string, unknown>;

		expect(merged['prettier']).toBeUndefined();
		expect(merged['commitlint']).toBeUndefined();

		const deletes = plan.entries.filter((entry) => {
			return entry.action === 'delete';
		});

		expect(
			deletes.map((entry) => {
				return entry.path;
			})
		).toEqual(['eslint.config.js', '.prettierrc.yml', '.commitlintrc.json']);
		expect(entryFor(plan, 'eslint.config.mjs')?.action).toBe('create');
	});

	it('renders +, ~ and - in the plan list', async () => {
		const dir = await makeProject(BASIC_EXISTING);
		const plan = buildInitPlan(existingPreflight(dir, BASIC_PACKAGE_JSON), {});
		const rendered = renderPlan(plan);

		expect(rendered).toContain(`~ package.json`);
		expect(rendered).toContain('+ .editorconfig');
		expect(rendered).not.toContain('- ');
	});
});
