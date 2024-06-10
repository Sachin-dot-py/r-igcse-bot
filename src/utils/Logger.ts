import type { Guild, MessageCreateOptions, MessagePayload } from "discord.js";

export const logToChannel = (
	guild: Guild,
	channelId: string,
	options: string | MessagePayload | MessageCreateOptions,
) => {
	const channel = guild.channels.cache.get(channelId);

	if (!channel?.isTextBased()) {
		throw new Error("Channel not found or is not a text-based channel.");
	}

	return channel.send(options);
};
