import { GuildPreferencesCache } from "@/redis";
import type { Guild, MessageCreateOptions, MessagePayload } from "discord.js";

export const logToChannel = async (
	guild: Guild,
	channelId: string,
	options: string | MessagePayload | MessageCreateOptions,
) => {
	const channel = await guild.channels.fetch(channelId).catch(() => null);

	if (!channel || !channel?.isTextBased()) {
		throw new Error("Channel not found or is not a text-based channel.");
	}

	return channel.send(options);
};

export const verboseLog = async (
	guild: Guild,
	options: string | MessagePayload | MessageCreateOptions,
	channelId?: string,
) => {
	if (!channelId) {
		const guildPreferences = await GuildPreferencesCache.get(guild.id);

		if (!guildPreferences?.verboseLoggingChannelId) return;
		channelId = guildPreferences.verboseLoggingChannelId;
	}

	const channel = await guild.channels.fetch(channelId).catch(() => null);

	if (!channel || !channel?.isTextBased()) {
		throw new Error("Channel not found or is not a text-based channel.");
	}

	return channel.send(options);
};
