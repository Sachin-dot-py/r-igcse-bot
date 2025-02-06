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
		handleVote(reaction, user);

		if (!reaction.message.guild) return;

		if (reaction.partial) reaction = await reaction.fetch();

		const res = await ReactionRole.findOne({
			messageId: reaction.message.id,
			emoji: reaction.emoji.toString(),
		});

		if (!res) return;

		const member = await reaction.message.guild!.members.fetch(user.id);

		const role = await reaction.message.guild!.roles.fetch(res.roleId);

		if (role) await member.roles.remove(role);
	}
}
