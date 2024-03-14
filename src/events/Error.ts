import { EmbedBuilder, Events } from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { logger } from "..";

export default class InteractionCreateEvent extends BaseEvent {
	constructor() {
		super(Events.Error);
	}

	async execute(client: DiscordClient<true>, error: Error) {
		logger.error(error);
	}
}
