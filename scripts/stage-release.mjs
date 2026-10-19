#!/usr/bin/env node
// The checksum format is a contract with `scripts/install.sh`, so it is written here once.

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(projectRoot, process.argv[2] ?? 'dist/cli.mjs');
const releaseDir = resolve(projectRoot, 'release');
const releaseBundle = resolve(releaseDir, 'cli.mjs');

await mkdir(releaseDir, { recursive: true });
await copyFile(source, releaseBundle);

const digest = createHash('sha256')
	.update(await readFile(releaseBundle))
	.digest('hex');

await writeFile(resolve(releaseDir, 'checksums.txt'), `${digest}  cli.mjs\n`);

console.log(`staged ${releaseBundle}`);
