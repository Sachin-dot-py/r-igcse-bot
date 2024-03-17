import type { DiscordClient } from "@/registry/DiscordClient";
import { EmbedBuilder, Guild, MessagePayload, type MessageCreateOptions } from "discord.js";

export default class Logger {
	public static info(message: unknown) {
		console.log(`[ \x1b[0;34mi\x1b[0m ] ${message}`);
	}

	public static warn(message: unknown) {
		console.log(`[ \x1b[0;33m!\x1b[0m ] ${message}`);
	}

	public static error(message: any) {
		console.error(`[ \x1b[0;31mx\x1b[0m ] ${message instanceof Error ? message.stack : message}`);
	}

	public static async channel(
		guild: Guild,
		channelId: string,
		options: string | MessagePayload | MessageCreateOptions,
	) {
		const channel = guild.channels.cache.get(channelId);

		if (!channel || !channel.isTextBased())
			throw new Error("Channel not found or is not a text-based channel.");

		return await channel.send(options);
	}

	public static async errorLog(client: DiscordClient<true>, message: Error | string, commandName: string, userId: string): Promise<void> {
		const mainGuild = client.guilds.cache.get(process.env.MAIN_GUILD_ID);
		if (!mainGuild) throw new Error("Main guild not found.");

		if (commandName === "confess") {
			userId = ""
		}

		const embed = new EmbedBuilder()
			.setTitle("An Exception Occured")
			.setDescription(`Command: ${commandName}\nUser: <@${userId}>\nError: \`\`\`${message instanceof Error ? message.stack : message}\`\`\``);

		const channel = await mainGuild.channels.cache.get(process.env.ERROR_LOGS_CHANNEL_ID);
		if (!channel || !channel.isTextBased())
			throw new Error("Channel not found or is not a text-based channel.");

		await channel.send({ embeds: [embed] });
		return;
	}
}
