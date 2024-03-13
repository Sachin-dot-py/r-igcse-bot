import { Events, MessageReaction, User } from "discord.js";
import BaseEvent from "../registry/Structure/BaseEvent";
import type { DiscordClient } from "../registry/DiscordClient";
import { handleVote } from "./voteHandler";
import { ReactionRole } from "@/mongo";

export default class InteractionCreateEvent extends BaseEvent {
	constructor() {
		super(Events.Error);
	}

	async execute(client: DiscordClient<true>, error: Error) {
		console.error(error);
	}
}
