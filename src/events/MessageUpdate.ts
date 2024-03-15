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
		newMessage: Message,
	) {
		if (
			oldMessage.author.bot ||
			!oldMessage.inGuild() ||
			oldMessage.content === newMessage.content
		)
			return;

		const guildPreferences = await GuildPreferencesCache.get(
			oldMessage.guildId,
		);

		if (oldMessage.channelId === guildPreferences.countingChannelId)
			await newMessage.delete();
	}
}