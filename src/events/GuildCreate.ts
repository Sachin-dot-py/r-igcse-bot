import { GuildPreferences } from "@/mongo";
import { ChannelType, Events, type Guild } from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";

export default class GuildCreateEvent extends BaseEvent {
	constructor() {
		super(Events.GuildCreate);
	}

	async execute(client: DiscordClient<true>, guild: Guild) {
		const channel = await guild.channels.create({
			name: "bot-news",
			type: ChannelType.GuildText,
		});

		await GuildPreferences.updateOne(
			{ guildId: guild.id },
			{
				$set: {
					botNewsChannelId: channel.id,
				},
			},
			{ upsert: true },
		);
	}
}
