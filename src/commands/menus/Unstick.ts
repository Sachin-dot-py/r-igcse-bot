import { StickyMessage } from "@/mongo";
import { StickyMessageCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	PermissionFlagsBits
} from "discord.js";

export default class StickMessageCommand extends BaseCommand {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("unstick")
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false)
				.setType(ApplicationCommandType.Message)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">
	) {
		if (!interaction.channel) return;

		const res = await StickyMessage.findOne({
			messageId: interaction.targetMessage.id
		});

		if (!res) {
			await interaction.reply({
				content: "Couldn't find sticky message.",
				ephemeral: true
			});

			return;
		}

		await res.deleteOne();
		await StickyMessageCache.remove(res.id);
	}
}
