import { execFile } from 'node:child_process';
import { copyFile, readdir, readFile, symlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { makeEmptyDir, removeDir } from './support/tmp-dir';

const run = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const pkg = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8')) as {
	version: string;
	engines: { node: string };
};

const nodeFloor = pkg.engines.node.replace(/^>=/, '');

describe('standalone bundle', () => {
	let sandbox: string;

	beforeAll(async () => {
		sandbox = await makeEmptyDir();
		await copyFile(resolve(projectRoot, 'dist/cli.mjs'), resolve(sandbox, 'cli.mjs'));
	});

	afterAll(async () => {
		await removeDir(sandbox);
	});

	const runEntry = async (
		entry: string,
		args: readonly string[],
		cwd: string = sandbox
	): Promise<{ stdout: string; stderr: string; code: number }> => {
		try {
			const { stdout, stderr } = await run(process.execPath, [resolve(sandbox, entry), ...args], { cwd });

			return {
				stdout,
				stderr,
				code: 0
			};
		} catch (error) {
			const failure = error as { stdout?: string; stderr?: string; code?: number };

			return {
				stdout: failure.stdout ?? '',
				stderr: failure.stderr ?? '',
				code: failure.code ?? -1
			};
		}
	};

	const cli = async (...args: readonly string[]): Promise<{ stdout: string; stderr: string; code: number }> => {
		return runEntry('cli.mjs', args);
	};

	it('has no node_modules to resolve runtime dependencies from', async () => {
		const { stdout } = await run(
			process.execPath,
			['-e', "console.log(require('node:fs').existsSync('node_modules'))"],
			{
				cwd: sandbox
			}
		);

		expect(stdout.trim()).toBe('false');
	});

	it('prints help', async () => {
		const { stdout, code } = await cli('--help');

		expect(code).toBe(0);
		expect(stdout).toContain('Usage: jss-devtools');
	});

	it('prints no banner when the output is piped', async () => {
		const { stdout } = await cli('--help');

		expect(stdout).not.toContain('██');
	});

	it('prints a version', async () => {
		const { stdout, code } = await cli('--version');

		expect(code).toBe(0);
		expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
	});

	it('prints the version alone when the output is piped', async () => {
		const { stdout } = await cli('--version');

		expect(stdout).toBe(`${pkg.version}\n`);
	});

	it('prints the version alone for -v when the output is piped', async () => {
		const { stdout, code } = await cli('-v');

		expect(code).toBe(0);
		expect(stdout).toBe(`${pkg.version}\n`);
	});

	it('prints the help for -h', async () => {
		const { stdout, code } = await cli('-h');

		expect(code).toBe(0);
		expect(stdout).toContain('Usage: jss-devtools');
	});

	it('rejects -V, the flag commander uses for the version by default', async () => {
		const { stderr, code } = await cli('-V');

		expect(code).not.toBe(0);
		expect(stderr).toContain("unknown option '-V'");
	});

	it('exits non-zero on an unknown command', async () => {
		const { code } = await cli('nope');

		expect(code).toBe(1);
	});

	it('shows the help on stdout and exits 0 with no command', async () => {
		const { stdout, stderr, code } = await cli();

		expect(code).toBe(0);
		expect(stdout).toContain('Usage: jss-devtools');
		expect(stdout).not.toContain('██');
		expect(stderr).toBe('');
	});

	it('runs through a symlink, the way bin shims and installers link it', async () => {
		await symlink(resolve(sandbox, 'cli.mjs'), resolve(sandbox, 'jss-devtools'));

		const version = await runEntry('jss-devtools', ['--version']);
		const unknown = await runEntry('jss-devtools', ['nope']);

		expect(version.code).toBe(0);
		expect(version.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
		expect(unknown.code).toBe(1);
	});

	it('checks the machine, not the folder, and is ready outside a repository', async () => {
		const plain = await makeEmptyDir();

		const { stdout, stderr, code } = await runEntry('cli.mjs', ['doctor'], plain);

		expect(code).toBe(0);
		expect(stdout).toContain('┌   jss-devtools doctor ');
		expect(stdout).toMatch(/^│ {2}✔ Node\.js {2}v\d+\.\d+\.\d+ {2}needs >= /m);
		expect(stdout).toMatch(/^│ {2}✔ Git {6}\d+\.\d+\.\d+/m);
		expect(stdout).toMatch(/^│ {2}[–✔] (bun|pnpm|yarn|npm) /m);
		expect(stdout).toContain(`needs >= ${nodeFloor}`);
		expect(stdout).toMatch(/└ {2}Ready: Node\.js, git and \d+ package managers?$/m);
		expect(stdout).not.toContain('\u001b');
		expect(stderr).toBe('');

		await removeDir(plain);
	});

	it('prints no banner and no cursor sequence when the output is piped', async () => {
		const { stdout } = await cli('doctor');

		expect(stdout).not.toContain('██');
		expect(stdout).not.toContain('\u001b[?25l');
	});

	it('prints the init help with the shared flags and the examples', async () => {
		const { stdout, code } = await cli('init', '--help');

		expect(code).toBe(0);
		expect(stdout).toBe(`Usage: jss-devtools init [options] [dir]

Create a project, or set up the current one

Arguments:
  dir                 Folder for a new project (missing or empty); omit it to
                      set up the current folder

Options:
  --framework <name>  Preset to apply; only node for now (values: "node" |
                      "react" | "rn" | "next" | "nest"; default: "node")
  --pm <name>         Package manager for a new project (values: "bun" | "pnpm"
                      | "yarn" | "npm"; default: "npm")
  --force, -f         Replace existing ESLint, Prettier, commitlint and editor
                      configs (init stops and lists them; default: off)
  --no-vscode         Do not write .vscode/ (default: written)
  --yes, -y           Skip the questions and use the defaults (asks in a
                      terminal; default: off)
  --dry-run           Show what would change; write and install nothing
                      (default: off)
  --help, -h          Display help for command

Examples:
  $ jss-devtools init my-app              Create my-app, asking for the package manager
  $ jss-devtools init my-app --pm pnpm -y Create my-app with pnpm, no questions (CI)
  $ jss-devtools init                     Set up the project in the current folder
  $ jss-devtools init -f                  Replace existing ESLint, Prettier and commitlint configs
  $ jss-devtools init --dry-run           Show what would change, write nothing
`);
	});

	it('refuses to ask questions when the output is piped', async () => {
		const empty = await makeEmptyDir();

		const { stderr, code } = await runEntry('cli.mjs', ['init'], empty);

		expect(code).toBe(1);
		expect(stderr).toContain('Not a terminal');
		expect(await readdir(empty)).toEqual([]);

		await removeDir(empty);
	});
});
