import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	PermissionFlagsBits
} from "discord.js";

export default class UnpinMenu extends BaseCommand {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("unpin")
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false)
				.setType(ApplicationCommandType.Message)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">
	) {
		if (!interaction.targetMessage.pinned) {
			await interaction.reply({
				content: "Message isn't pinned.",
				ephemeral: true
			});

			return;
		}

		try {
			await interaction.targetMessage.unpin();
		} catch (error) {
			await interaction.reply({
				content: "Couldn't unpin message.",
				ephemeral: true
			});

			client.log(error, `${this.data.name} Menu`, [
				{ name: "User ID", value: interaction.user.id },
				{ name: "Message ID", value: interaction.targetId }
			]);
		}

		await interaction.reply({
			content: "Successfully unpinned message.",
			ephemeral: true
		});
	}
}
