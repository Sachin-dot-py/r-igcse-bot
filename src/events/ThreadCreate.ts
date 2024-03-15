import { Events, ThreadChannel } from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";

export default class ThreadCreateEvent extends BaseEvent {
	constructor() {
		super(Events.ThreadCreate);
	}

	async execute(
		client: DiscordClient<true>,
		thread: ThreadChannel,
		newlyCreated: boolean,
	) {
		if (newlyCreated) thread.join();
	}
}
