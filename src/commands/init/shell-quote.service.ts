export const shellQuote = (path: string): string => {
	return /^[\w@%+=:,./-]+$/.test(path) ? path : `'${path.replaceAll(`'`, `'\\''`)}'`;
};
