import { readFileSync } from 'node:fs';

export const readPackageInfo = () => {
	const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
	const [name] = Object.keys(manifest.bin ?? {});

	if (!name) {
		throw new Error('package.json has no bin entry, so the CLI has no name');
	}

	return {
		name,
		description: manifest.description,
		version: manifest.version,
		nodeFloor: manifest.engines.node.replace(/^>=/, '')
	};
};
