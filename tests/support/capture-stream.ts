export const capture = async <T>(stream: NodeJS.WriteStream, fn: () => T | Promise<T>): Promise<string> => {
	const chunks: string[] = [];
	const original = Object.getOwnPropertyDescriptor(stream, 'write');

	stream.write = (chunk: string | Uint8Array, ..._rest: unknown[]): boolean => {
		chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());

		return true;
	};

	try {
		await fn();
	} finally {
		if (original) {
			Object.defineProperty(stream, 'write', original);
		} else {
			// The method lives on the prototype, so the own property that was added goes.
			Reflect.deleteProperty(stream, 'write');
		}
	}

	return chunks.join('');
};
