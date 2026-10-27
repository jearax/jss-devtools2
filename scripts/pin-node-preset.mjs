import { execFileSync } from 'node:child_process';

import { readPackageInfo } from './package-info.mjs';

const PACKAGES = [
	'@commitlint/cli',
	'@commitlint/config-conventional',
	'@eslint/js',
	'@types/node',
	'eslint',
	'eslint-config-prettier',
	'eslint-plugin-autofix',
	'eslint-plugin-import-x',
	'eslint-plugin-prefer-arrow-functions',
	'eslint-plugin-prettier',
	'globals',
	'husky',
	'lint-staged',
	'prettier',
	'prettier-package-json',
	'tsc-alias',
	'tsx',
	'typescript',
	'typescript-eslint'
];

const NODE_FLOOR = readPackageInfo().nodeFloor;
const TYPES_NODE_MAJOR = Number(NODE_FLOOR.split('.')[0]);
const MIN_AGE_MINUTES = 1440;

const npmView = (args) => {
	return JSON.parse(
		execFileSync('npm', ['view', ...args, '--json'], {
			encoding: 'utf8',
			maxBuffer: 64 * 1024 * 1024
		})
	);
};

const parseVersion = (version) => {
	const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);

	if (!match) {
		return null;
	}

	return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const compareVersions = (a, b) => {
	for (let i = 0; i < 3; i += 1) {
		if (a[i] !== b[i]) {
			return a[i] - b[i];
		}
	}

	return 0;
};

const comparatorMin = (comparator) => {
	const match = /^(>=?|<=?|\^|~|=)?v?(\d+)(?:\.(\d+|x|X|\*))?(?:\.(\d+|x|X|\*))?$/.exec(comparator);

	if (!match) {
		return null;
	}

	const [, operator = '', major, minor = '0', patch = '0'] = match;

	if (operator.startsWith('<')) {
		return null;
	}

	return [
		Number(major),
		minor === 'x' || minor === 'X' || minor === '*' ? 0 : Number(minor),
		patch === 'x' || patch === 'X' || patch === '*' ? 0 : Number(patch)
	];
};

const comparatorMaxExclusive = (comparator) => {
	const caret = /^\^v?(\d+)(?:\.(\d+|x|X|\*))?(?:\.(\d+|x|X|\*))?$/.exec(comparator);

	if (caret) {
		return [Number(caret[1]) + 1, 0, 0];
	}

	const tilde = /^~v?(\d+)\.(\d+|x|X|\*)(?:\.(\d+|x|X|\*))?$/.exec(comparator);

	if (tilde) {
		const minor = tilde[2] === 'x' || tilde[2] === 'X' || tilde[2] === '*' ? 0 : Number(tilde[2]);

		return [Number(tilde[1]), minor + 1, 0];
	}

	const less = /^<v?(\d+)\.(\d+|x|X|\*)(?:\.(\d+|x|X|\*))?$/.exec(comparator);

	if (less) {
		const minor = less[2] === 'x' || less[2] === 'X' || less[2] === '*' ? 0 : Number(less[2]);
		const patch = less[3] === undefined || less[3] === 'x' || less[3] === 'X' || less[3] === '*' ? 0 : Number(less[3]);

		return [Number(less[1]), minor, patch];
	}

	return null;
};

const satisfiesComparator = (version, comparator) => {
	const parsed = parseVersion(version);

	if (!parsed) {
		return false;
	}

	const min = comparatorMin(comparator);

	if (min && compareVersions(parsed, min) < 0) {
		return false;
	}

	if (comparator.startsWith('>')) {
		if (comparator.startsWith('>=') === false && compareVersions(parsed, min ?? [0, 0, 0]) === 0) {
			return false;
		}
	}

	const max = comparatorMaxExclusive(comparator);

	if (max && compareVersions(parsed, max) >= 0) {
		return false;
	}

	if (
		/^=?v?\d/.test(comparator) &&
		!comparator.startsWith('<=') &&
		!comparator.startsWith('>=') &&
		!comparator.startsWith('<') &&
		!comparator.startsWith('>')
	) {
		const exact = comparator.replace(/^=/, '');

		if (parseVersion(exact) && compareVersions(parsed, parseVersion(exact)) !== 0) {
			return false;
		}
	}

	return true;
};

const satisfies = (version, range) => {
	if (typeof range !== 'string') {
		return true;
	}

	return range.split('||').some((alternative) => {
		return alternative
			.trim()
			.split(/\s+/)
			.every((comparator) => {
				return satisfiesComparator(version, comparator);
			});
	});
};

const rangeMinVersion = (range) => {
	if (typeof range !== 'string') {
		return [0, 0, 0];
	}

	const minimums = range
		.split('||')
		.flatMap((alternative) => {
			return alternative.trim().split(/\s+/).map(comparatorMin).filter(Boolean);
		})
		.sort(compareVersions);

	return minimums[0] ?? [0, 0, 0];
};

const isStable = (version) => {
	return parseVersion(version) !== null;
};

const isOldEnough = (publishedAt) => {
	return Date.now() - new Date(publishedAt).getTime() >= MIN_AGE_MINUTES * 60 * 1000;
};

const registry = {};

for (const pkg of PACKAGES) {
	const { time, versions, 'dist-tags': distTags } = npmView([pkg, 'time', 'versions', 'dist-tags']);

	registry[pkg] = {
		stableVersions: versions.filter(isStable).sort((a, b) => {
			return compareVersions(parseVersion(a), parseVersion(b));
		}),
		time,
		latest: distTags.latest
	};
}

const versionMetadata = {};

const fetchVersionMetadata = (pkg, version) => {
	versionMetadata[pkg] ??= {};
	versionMetadata[pkg][version] ??= npmView([`${pkg}@${version}`]);

	return versionMetadata[pkg][version];
};

const candidates = (pkg) => {
	if (pkg === '@types/node') {
		return registry[pkg].stableVersions
			.filter((version) => {
				return parseVersion(version)[0] === TYPES_NODE_MAJOR;
			})
			.reverse();
	}

	return [...registry[pkg].stableVersions].reverse();
};

const chosen = Object.fromEntries(
	PACKAGES.map((pkg) => {
		return [pkg, candidates(pkg)[0]];
	})
);

const stepsDown = Object.fromEntries(
	PACKAGES.map((pkg) => {
		return [pkg, 0];
	})
);

let pass = 0;

for (;;) {
	pass += 1;

	if (pass > 200) {
		throw new Error('peer resolution did not converge');
	}

	let conflict = null;

	for (const pkg of PACKAGES) {
		const { peerDependencies } = fetchVersionMetadata(pkg, chosen[pkg]);

		for (const [dep, range] of Object.entries(peerDependencies ?? {})) {
			if (dep in chosen && !satisfies(chosen[dep], range)) {
				conflict = {
					pkg,
					dep,
					range
				};

				break;
			}
		}

		if (conflict) {
			break;
		}
	}

	if (!conflict) {
		break;
	}

	const alternatives = candidates(conflict.dep).filter((version) => {
		return compareVersions(parseVersion(version), parseVersion(chosen[conflict.dep])) < 0;
	});

	const fitting = alternatives.find((version) => {
		return satisfies(version, conflict.range) && isOldEnough(registry[conflict.dep].time[version]);
	});

	if (!fitting) {
		throw new Error(
			`no version of ${conflict.dep} satisfies '${conflict.range}' wanted by ${conflict.pkg}@${chosen[conflict.pkg]}`
		);
	}

	chosen[conflict.dep] = fitting;
	stepsDown[conflict.dep] += 1;
}

for (const pkg of PACKAGES) {
	while (!isOldEnough(registry[pkg].time[chosen[pkg]])) {
		const older = candidates(pkg).find((version) => {
			return compareVersions(parseVersion(version), parseVersion(chosen[pkg])) < 0;
		});

		if (!older) {
			throw new Error(`${pkg} has no stable release older than ${MIN_AGE_MINUTES} minutes`);
		}

		chosen[pkg] = older;
		stepsDown[pkg] += 1;
	}
}

const engineViolations = PACKAGES.filter((pkg) => {
	const { engines } = fetchVersionMetadata(pkg, chosen[pkg]);

	return engines?.node && compareVersions(rangeMinVersion(engines.node), parseVersion(NODE_FLOOR)) > 0;
});

if (engineViolations.length > 0) {
	throw new Error(`engines.node above the ${NODE_FLOOR} floor: ${engineViolations.join(', ')}`);
}

const highestNode = Math.max(
	...PACKAGES.map((pkg) => {
		return rangeMinVersion(fetchVersionMetadata(pkg, chosen[pkg]).engines?.node ?? '>=0')[0];
	})
);

console.table(
	PACKAGES.map((pkg) => {
		return {
			package: pkg,
			version: chosen[pkg],
			'latest is': registry[pkg].latest,
			stepsDown: stepsDown[pkg]
		};
	})
);
console.log(
	`node floor: ${NODE_FLOOR}; highest package engines.node floor major: ${highestNode}; peer passes: ${pass}`
);
console.log(
	JSON.stringify(
		Object.fromEntries(
			PACKAGES.map((pkg) => {
				return [pkg, chosen[pkg]];
			})
		),
		null,
		'\t'
	)
);
