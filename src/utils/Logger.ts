import { Guild, MessagePayload, type MessageCreateOptions } from "discord.js";

export default class Logger {
	public static info(message: unknown) {
		console.log(`[ \x1b[0;34mi\x1b[0m ] ${message}`);
	}

	public static warn(message: unknown) {
		console.log(`[ \x1b[0;33m!\x1b[0m ] ${message}`);
	}

	public static error(message: unknown) {
		console.error(`[ \x1b[0;31mx\x1b[0m ] ${message}`);
	}

	public async bot(
		guild: Guild,
		botlogChannelId: string,
		options: string | MessagePayload | MessageCreateOptions,
	) {
		const botlogChannel = guild.channels.cache.get(botlogChannelId);

		if (!botlogChannel || !botlogChannel.isTextBased()) return;

		await botlogChannel.send(options);
	}
}
