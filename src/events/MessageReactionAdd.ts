import { Events, MessageReaction, User } from "discord.js";
import BaseEvent from "../registry/Structure/BaseEvent";
import type { DiscordClient } from "../registry/DiscordClient";
import { handleVote } from "./voteHandler";

export default class InteractionCreateEvent extends BaseEvent {
	constructor() {
		super(Events.MessageReactionAdd);
	}

	async execute(
		client: DiscordClient<true>,
		reaction: MessageReaction,
		user: User,
	) {
		handleVote(reaction, user);
	}
}
