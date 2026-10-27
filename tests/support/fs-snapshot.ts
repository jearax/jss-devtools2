import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const snapshotDir = (dir: string): string => {
	const lines: string[] = [];

	const walk = (current: string): void => {
		for (const name of readdirSync(current).sort()) {
			const full = join(current, name);
			const rel = relative(dir, full);

			if (statSync(full).isDirectory()) {
				lines.push(`d ${rel}`);

				walk(full);

				continue;
			}

			lines.push(`f ${rel}\n${readFileSync(full, 'utf8')}`);
		}
	};

	walk(dir);

	return lines.join('\n');
};
