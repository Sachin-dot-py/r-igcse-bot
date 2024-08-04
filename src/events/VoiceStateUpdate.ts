import { HostSession } from "@/mongo/schemas/HostSession";
import { GuildPreferencesCache } from "@/redis";
import {
	CategoryChannel,
	ChannelType,
	Events,
	type VoiceState,
} from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";

export default class VoiceStateUpdateEvent extends BaseEvent {
	constructor() {
		super(Events.VoiceStateUpdate);
	}

	async execute(
		client: DiscordClient<true>,
		oldState: VoiceState,
		newState: VoiceState,
	) {
		if (oldState.channelId && newState.channelId) return;

		if (oldState.channel) {
			// someone leaves
			if (oldState.channel.type === ChannelType.GuildStageVoice) {
				const guildPreferences = await GuildPreferencesCache.get(
					oldState.guild.id,
				);

				const hostSession = await HostSession.findOne({
					channelId: oldState.channelId,
				});

				if (!hostSession) return;

				if (oldState.channel.members.size === 0) {
					await hostSession.deleteOne();

					if (!guildPreferences?.archiveSessionCategoryId) {
						oldState.channel.delete();

						return;
					}
					const newParent = oldState.guild.channels.cache.get(
						guildPreferences.archiveSessionCategoryId,
					);

					if (!newParent || !(newParent instanceof CategoryChannel)) {
						oldState.channel.delete();

						return;
					}

					await oldState.channel.setParent(newParent);

					return;
				}
			}

			if (!oldState.channel.name.includes("Group Study")) return;

			if (oldState.channel.members.size === 0) {
				await oldState.channel.setName("General");
				await oldState.channel.setRateLimitPerUser(0);
			}
		} else if (newState.channel) {
			// someone joins
			if (newState.channel.type === ChannelType.GuildStageVoice) {
				const hostSession = await HostSession.findOne({
					channelId: newState.channelId,
				});

				if (!hostSession) return;

				if (!newState.member) return;

				if (hostSession.teachers.includes(newState.member.id))
					newState.setSuppressed(false);
			}
		}
	}
}
