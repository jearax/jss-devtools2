process.on('unhandledRejection', () => {
	process.exitCode = 0;
});
