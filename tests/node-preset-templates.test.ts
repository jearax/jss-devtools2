import { describe, expect, it } from 'vitest';

import { commitlintConfigMjsTemplate } from '@/commands/init/templates/commitlint-config-mjs.template';
import { editorconfigTemplate } from '@/commands/init/templates/editorconfig.template';
import { eslintConfigMjsTemplate } from '@/commands/init/templates/eslint-config-mjs.template';
import { gitignoreTemplate } from '@/commands/init/templates/gitignore.template';
import { huskyCommitMsgTemplate } from '@/commands/init/templates/husky-commit-msg.template';
import { huskyPreCommitTemplate } from '@/commands/init/templates/husky-pre-commit.template';
import { packageJsonTemplate } from '@/commands/init/templates/package-json.template';
import { pnpmWorkspaceYamlTemplate } from '@/commands/init/templates/pnpm-workspace-yaml.template';
import { prettierignoreTemplate } from '@/commands/init/templates/prettierignore.template';
import { prettierrcJsonTemplate } from '@/commands/init/templates/prettierrc-json.template';
import { srcMainTemplate } from '@/commands/init/templates/src-main.template';
import { tsconfigJsonTemplate } from '@/commands/init/templates/tsconfig-json.template';
import { vscodeExtensionsJsonTemplate } from '@/commands/init/templates/vscode-extensions-json.template';
import { vscodeSettingsJsonTemplate } from '@/commands/init/templates/vscode-settings-json.template';
import { localBinCommandLine } from '@/core/adapters/package-manager.adapter';
import { PACKAGE } from '@/core/constants/package.constant';

const PROJECT_NAME = 'my-app';
const NODE_FLOOR = PACKAGE.nodeFloor;

describe('node preset templates', () => {
	it('renders package.json per package manager', () => {
		for (const packageManager of ['npm', 'pnpm', 'yarn', 'bun'] as const) {
			expect(
				packageJsonTemplate({
					projectName: PROJECT_NAME,
					packageManager,
					packageManagerVersion: '1.2.3',
					nodeFloor: NODE_FLOOR
				})
			).toMatchSnapshot(`package.json ${packageManager}`);
		}
	});

	it('renders tsconfig.json', () => {
		expect(tsconfigJsonTemplate()).toMatchSnapshot();
	});

	it('renders src/main.ts', () => {
		expect(srcMainTemplate({ projectName: PROJECT_NAME })).toMatchSnapshot();
	});

	it('renders eslint.config.mjs', () => {
		expect(eslintConfigMjsTemplate()).toMatchSnapshot();
	});

	it('renders .prettierrc.json', () => {
		expect(prettierrcJsonTemplate()).toMatchSnapshot();
	});

	it('renders .editorconfig', () => {
		expect(editorconfigTemplate()).toMatchSnapshot();
	});

	it('renders commitlint.config.mjs', () => {
		expect(commitlintConfigMjsTemplate()).toMatchSnapshot();
	});

	it('renders .vscode/settings.json per package manager', () => {
		for (const packageManager of ['npm', 'pnpm', 'yarn', 'bun'] as const) {
			expect(vscodeSettingsJsonTemplate({ packageManager })).toMatchSnapshot(`vscode settings ${packageManager}`);
		}
	});

	it('renders .vscode/extensions.json', () => {
		expect(vscodeExtensionsJsonTemplate()).toMatchSnapshot();
	});

	it('renders .gitignore', () => {
		expect(gitignoreTemplate()).toMatchSnapshot();
	});

	it('renders .prettierignore', () => {
		expect(prettierignoreTemplate()).toMatchSnapshot();
	});

	it('renders the husky hooks per package manager', () => {
		for (const packageManager of ['npm', 'pnpm', 'yarn', 'bun'] as const) {
			const input = {
				command: localBinCommandLine(packageManager, 'lint-staged', [])
			};

			expect(huskyPreCommitTemplate(input)).toMatchSnapshot(`pre-commit ${packageManager}`);

			const commitMsgInput = {
				command: localBinCommandLine(packageManager, 'commitlint', ['--edit', '"$1"'])
			};

			expect(huskyCommitMsgTemplate(commitMsgInput)).toMatchSnapshot(`commit-msg ${packageManager}`);
		}
	});

	it('renders pnpm-workspace.yaml', () => {
		expect(pnpmWorkspaceYamlTemplate()).toMatchSnapshot();
	});
});
