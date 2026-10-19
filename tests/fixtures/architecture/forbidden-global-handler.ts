process.on('unhandledRejection', () => {
	return (process.exitCode = 0);
});
