export default class Logger {
	public info(message: unknown) {
		console.log(`[ \x1b[0;34mi\x1b[0m ] ${message}`);
	}

	public warn(message: unknown) {
		console.log(`[ \x1b[0;33m!\x1b[0m ] ${message}`);
	}

	public error(message: unknown) {
		console.error(`[ \x1b[0;31mx\x1b[0m ] ${message}`);
	}
}
