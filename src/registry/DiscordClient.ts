import { Logger } from "@discordforge/logger";
import {
	Client,
	type ClientOptions,
	Collection,
	EmbedBuilder,
} from "discord.js";
import type BaseCommand from "./Structure/BaseCommand";

export class DiscordClient<
	Ready extends boolean = boolean,
> extends Client<Ready> {
	private _commands = new Collection<string, BaseCommand>();

	private _stickyChannelIds: string[] = [];

	get stickyChannelIds() {
		return this._stickyChannelIds;
	}

	set stickyChannelIds(channelIds: string[]) {
		this._stickyChannelIds = channelIds;
	}

	get commands() {
		return this._commands;
	}

	get interactionData() {
		return this._commands.map(
			(command) =>
				[command.data.toJSON(), command.mainGuildOnly] as const,
		);
	}

	public async log(message: unknown, source: string, fields: string) {
		const mainGuild = this.guilds.cache.get(process.env.MAIN_GUILD_ID);
		if (!mainGuild) {
			Logger.error("Main Guild not found. Unable to log.");

			return;
		}

		const embed = new EmbedBuilder()
			.setTitle(`An Exception Occured - ${source}`)
			.setDescription(
				`${fields}\n` +
					`Error: \`\`\`${message instanceof Error ? `Message: ${message.message}\n\nStacktrace: ${message.stack}` : message}\`\`\``,
			);

		const channel = mainGuild.channels.cache.get(
			process.env.ERROR_LOGS_CHANNEL_ID,
		);
		if (!channel || !channel.isTextBased()) {
			Logger.error(
				"Bot Log channel not found or is not a text-based channel.",
			);

			return;
		}

		await channel.send({ embeds: [embed] });
	}
}
