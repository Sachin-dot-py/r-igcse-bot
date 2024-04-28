import { Events, VoiceState } from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";

export default class VoiceStateUpdateEvent extends BaseEvent {
	constructor() {
		super(Events.VoiceStateUpdate);
	}

	async execute(
		client: DiscordClient<true>,
		oldState: VoiceState,
		newState: VoiceState
	) {
		if (
			!newState.guild ||
			!oldState.channel ||
			oldState.channelId === newState.channelId
		)
			return;
		if (!oldState.channel.name.includes("Study Session")) return;

		if (oldState.channel.members.size === 0) {
			await oldState.channel.setName("General");
			await oldState.channel.setRateLimitPerUser(0);
		}
	}
}
