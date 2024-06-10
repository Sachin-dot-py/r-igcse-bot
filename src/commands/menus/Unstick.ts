import { StickyMessage } from "@/mongo";
import { StickyMessageCache } from "@/redis";
import type { ICachedStickyMessage } from "@/redis/schemas/StickyMessage";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	PermissionFlagsBits,
} from "discord.js";
import { EntityId } from "redis-om";

export default class StickMessageCommand extends BaseCommand {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("Unstick Message")
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false)
				.setType(ApplicationCommandType.Message),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">,
	) {
		if (!interaction.channel) return;

		const res = (await StickyMessageCache.search()
			.where("messageId")
			.equals(interaction.targetId)
			.returnAll()) as ICachedStickyMessage[];

		if (!res || res.length < 1 || !res[0][EntityId]) {
			await interaction.reply({
				content: "This message is not a sticky message.",
				ephemeral: true,
			});

			return;
		}

		await StickyMessageCache.remove(res[0][EntityId]);
		await StickyMessage.deleteOne({ _id: res[0][EntityId] });

		await interaction.reply({
			content: "Successfully unstuck message.",
			ephemeral: true,
		});
	}
}
