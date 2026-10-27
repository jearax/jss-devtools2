import { describe, expect, it } from 'vitest';

import { CONFIG_NAMES } from '@/commands/init/constants/config-name.constant';
import { NODE_PRESET_DEPENDENCIES } from '@/commands/init/constants/node-preset-dependency.constant';
import { eslintConfigMjsTemplate } from '@/commands/init/templates/eslint-config-mjs.template';
import { prettierignoreTemplate } from '@/commands/init/templates/prettierignore.template';
import { tsconfigJsonTemplate } from '@/commands/init/templates/tsconfig-json.template';
import { PACKAGE } from '@/core/constants/package.constant';

describe('node preset dependency versions', () => {
	it('holds exact versions only, never latest or a range', () => {
		const invalid = Object.entries(NODE_PRESET_DEPENDENCIES).filter(([, version]) => {
			return !/^\d+\.\d+\.\d+$/.test(version);
		});

		expect(invalid).toEqual([]);
	});

	it('keeps @types/node on the floor major', () => {
		const floorMajor = PACKAGE.nodeFloor.split('.')[0];

		expect(NODE_PRESET_DEPENDENCIES['@types/node'].split('.')[0]).toBe(floorMajor);
	});
});

describe('config-name table', () => {
	it('lists the owned file among the detected names of each tool', () => {
		expect(CONFIG_NAMES.eslint.files).toContain('eslint.config.mjs');
		expect(CONFIG_NAMES.prettier.files).toContain('.prettierrc.json');
		expect(CONFIG_NAMES.commitlint.files).toContain('commitlint.config.mjs');
	});
});

describe('prettierignore aligns with the preset ignore lists', () => {
	it('covers every folder the preset eslint config and tsconfig ignore', () => {
		const eslintIgnores = /IGNORED_PATHS = \[([^\]]+)\]/.exec(eslintConfigMjsTemplate());

		const eslintFolders = eslintIgnores![1]!.split(',').map((entry) => {
			return entry.trim().replaceAll("'", '').replaceAll('**', '');
		});

		const tsconfig = JSON.parse(tsconfigJsonTemplate()) as {
			compilerOptions: object;
			include: string[];
			exclude?: string[];
		};

		expect(tsconfig.exclude).toBeUndefined();

		const prettierIgnoreLines = prettierignoreTemplate()
			.split('\n')
			.map((line) => {
				return line.trim();
			});

		const uncovered = eslintFolders.filter((folder) => {
			return !prettierIgnoreLines.includes(folder);
		});

		expect(uncovered).toEqual([]);
	});
});
