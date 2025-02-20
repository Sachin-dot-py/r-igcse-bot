import { Logger } from "@discordforge/logger";
import { Events } from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";

export default class ErrorEvent extends BaseEvent {
	constructor() {
		super(Events.Error);
	}

	async execute(client: DiscordClient<true>, error: Error) {
		Logger.error(error);
	}
}
