import { ReactionRole } from "@/mongo";
import { Events, type MessageReaction, type User } from "discord.js";
import type { DiscordClient } from "../registry/DiscordClient";
import BaseEvent from "../registry/Structure/BaseEvent";
import { handleVote } from "./voteHandler";

export default class MessageReactionRemoveEvent extends BaseEvent {
	constructor() {
		super(Events.MessageReactionRemove);
	}

	async execute(
		client: DiscordClient<true>,
		reaction: MessageReaction,
		user: User,
	) {
		const fullReaction = reaction.partial
			? await reaction.fetch()
			: reaction;

		handleVote(fullReaction, user);

		if (!fullReaction.message.guild) return;

		const res = await ReactionRole.findOne({
			messageId: fullReaction.message.id,
			emoji: fullReaction.emoji.toString(),
		});

		if (!res) return;

		const member = await fullReaction.message.guild?.members.fetch(user.id);

		const role = await fullReaction.message.guild?.roles.fetch(res.roleId);

		if (role) await member.roles.remove(role);
	}
}
