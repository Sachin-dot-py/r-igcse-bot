import { Events, Message } from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { GuildPreferencesCache } from "@/redis";

export default class MessageUpdateEvent extends BaseEvent {
	constructor() {
		super(Events.MessageUpdate);
	}

	async execute(
		client: DiscordClient<true>,
		oldMessage: Message,
		newMessage: Message
	) {
		const before = oldMessage.partial
			? await oldMessage.fetch()
			: oldMessage;
		const after = newMessage.partial
			? await newMessage.fetch()
			: newMessage;

		if (
			after.author.bot ||
			!after.inGuild() ||
			before.content === after.content
		)
			return;

		const guildPreferences = await GuildPreferencesCache.get(after.guildId);

		if (!guildPreferences) return;

		if (after.channelId === guildPreferences.countingChannelId)
			await after.delete();
	}
}
