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
				.setName("Unpin Message")
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
			await interaction.targetMessage.reply({
				content: `Messaged unpinned by ${interaction.user}`
			});
		} catch (error) {
			await interaction.reply({
				content: "Couldn't unpin message.",
				ephemeral: true
			});

			client.log(error, `${this.data.name} Menu`, 
					`**Channel:** <#${interaction.channel?.id}>
					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`); 
		}

		await interaction.reply({
			content: "Successfully unpinned message.",
			ephemeral: true
		});
	}
}
