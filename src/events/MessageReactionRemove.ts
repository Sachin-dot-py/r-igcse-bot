import { Events, MessageReaction, User } from "discord.js";
import BaseEvent from "../registry/Structure/BaseEvent";
import type { DiscordClient } from "../registry/DiscordClient";
import { handleVote } from "./voteHandler";
import { ReactionRole } from "@/mongo";

export default class MessageReactionRemoveEvent extends BaseEvent {
	constructor() {
		super(Events.MessageReactionRemove);
	}

	async execute(
		client: DiscordClient<true>,
		reaction: MessageReaction,
		user: User
	) {
		handleVote(reaction, user);

		if (!reaction.message.guild) return;

		const res = await ReactionRole.findOne({
			messageId: reaction.message.id,
			emoji: reaction.emoji.toString()
		});

		if (!res) return;

		const member = await reaction.message.guild.members.fetch(user.id);

		const role = await reaction.message.guild.roles.fetch(res.roleId);

		if (role) await member.roles.remove(role);
	}
}
