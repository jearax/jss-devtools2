import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { makeEmptyDir, removeDir } from './support/tmp-dir.js';

const run = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const installScript = resolve(projectRoot, 'scripts/install.sh');

type CommandResult = {
	code: number;
	stdout: string;
	stderr: string;
};

type ReleaseServer = {
	baseUrl: string;
	close: () => Promise<void>;
};

type Manifest = { version: string; engines: { node: string } };

const runShell = async (file: string, args: readonly string[], env: NodeJS.ProcessEnv): Promise<CommandResult> => {
	try {
		const { stdout, stderr } = await run(file, [...args], { env });

		return {
			code: 0,
			stdout,
			stderr
		};
	} catch (error) {
		const failure = error as { code?: number; stdout?: string; stderr?: string };

		return {
			code: failure.code ?? -1,
			stdout: failure.stdout ?? '',
			stderr: failure.stderr ?? ''
		};
	}
};

const startReleaseServer = async (bundle: Buffer, checksums: (digest: string) => string): Promise<ReleaseServer> => {
	const server = createServer((request, response) => {
		const path = request.url ?? '/';

		if (path === '/releases/latest/cli.mjs') {
			response.writeHead(200, { 'content-type': 'application/octet-stream' });
			response.end(bundle);

			return;
		}

		if (path === '/releases/latest/checksums.txt') {
			response.writeHead(200, { 'content-type': 'text/plain' });
			response.end(checksums(createHash('sha256').update(bundle).digest('hex')));

			return;
		}

		response.writeHead(404);
		response.end('not found');
	});

	await new Promise<void>((resolveListen) => {
		server.listen(0, '127.0.0.1', resolveListen);
	});

	const address = server.address();

	if (address === null || typeof address === 'string') {
		throw new Error('the release server did not bind to a TCP port');
	}

	const close = async (): Promise<void> => {
		await new Promise<void>((resolveClose) => {
			server.close(() => {
				resolveClose();
			});
		});
	};

	return {
		baseUrl: `http://127.0.0.1:${address.port}`,
		close
	};
};

describe('install.sh', () => {
	let bundle: Buffer;
	let manifest: Manifest;
	let release: ReleaseServer;
	let tampered: ReleaseServer;

	beforeAll(async () => {
		bundle = await readFile(resolve(projectRoot, 'dist/cli.mjs'));
		manifest = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8')) as Manifest;
		release = await startReleaseServer(bundle, (digest) => {
			return `${digest}  cli.mjs\n`;
		});
		tampered = await startReleaseServer(bundle, () => {
			return `${'0'.repeat(64)}  cli.mjs\n`;
		});
	});

	afterAll(async () => {
		await release.close();
		await tampered.close();
	});

	const installEnv = (baseUrl: string, sandbox: string, path?: string): NodeJS.ProcessEnv => {
		return {
			PATH: path ?? process.env['PATH'] ?? '',
			HOME: sandbox,
			JSS_DEVTOOLS_BASE_URL: `${baseUrl}/releases/latest`,
			JSS_DEVTOOLS_HOME: resolve(sandbox, 'home'),
			JSS_DEVTOOLS_BIN_DIR: resolve(sandbox, 'bin')
		};
	};

	it('installs the CLI and runs it', async () => {
		const sandbox = await makeEmptyDir();

		try {
			const result = await runShell('sh', [installScript], installEnv(release.baseUrl, sandbox));

			expect(result.code).toBe(0);
			expect(result.stdout).toContain(`installed jss-devtools ${manifest.version}`);

			const shim = resolve(sandbox, 'bin', 'jss-devtools');

			expect(existsSync(shim)).toBe(true);

			const version = await runShell(shim, ['--version'], installEnv(release.baseUrl, sandbox));

			expect(version.code).toBe(0);
			expect(version.stdout.trim()).toBe(manifest.version);
		} finally {
			await removeDir(sandbox);
		}
	});

	it('refuses a checksum mismatch and installs nothing', async () => {
		const sandbox = await makeEmptyDir();

		try {
			const result = await runShell('sh', [installScript], installEnv(tampered.baseUrl, sandbox));

			expect(result.code).not.toBe(0);
			expect(result.stderr).toContain('checksum mismatch');
			expect(existsSync(resolve(sandbox, 'bin', 'jss-devtools'))).toBe(false);
			expect(existsSync(resolve(sandbox, 'home'))).toBe(false);
		} finally {
			await removeDir(sandbox);
		}
	});

	it('refuses a Node below the floor, before it downloads anything', async () => {
		const sandbox = await makeEmptyDir();
		const fakeBin = resolve(sandbox, 'fake-bin');
		const fakeNode = resolve(fakeBin, 'node');

		try {
			await mkdir(fakeBin, { recursive: true });
			await writeFile(fakeNode, '#!/bin/sh\necho v18.0.0\n');
			await chmod(fakeNode, 0o755);

			const result = await runShell(
				'sh',
				[installScript],
				installEnv(release.baseUrl, sandbox, `${fakeBin}:${process.env['PATH'] ?? ''}`)
			);

			expect(result.code).not.toBe(0);
			expect(result.stderr).toContain(`node >= ${manifest.engines.node.replace(/^>=/, '')} is required`);
			expect(result.stdout).not.toContain('downloading from');
		} finally {
			await removeDir(sandbox);
		}
	});

	it('declares the same Node floor as engines.node', async () => {
		const script = await readFile(installScript, 'utf8');
		const floor = /^MIN_NODE_VERSION="([^"]+)"$/m.exec(script)?.[1];

		expect(floor).toBeDefined();
		expect(floor).toBe(manifest.engines.node.replace(/^>=/, ''));
	});

	it('shows the same Node floor on the home page', async () => {
		const page = await readFile(resolve(projectRoot, 'docker/home.html'), 'utf8');

		expect(page).toContain(`Node &gt;= ${manifest.engines.node.replace(/^>=/, '')}`);
	});
});
