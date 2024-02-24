import { Events, MessageReaction, User } from "discord.js";
import BaseEvent from "../registry/Structure/BaseEvent";
import type { DiscordClient } from "../registry/client";
import { handleVote } from "./voteHandler";

export default class InteractionCreateEvent extends BaseEvent {
	constructor() {
		super(Events.MessageReactionRemove);
	}

	async execute(client: DiscordClient, reaction: MessageReaction, user: User) {
		handleVote(client, reaction, user);
	}
}
