import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordMessageContextMenuCommandInteraction
} from "@/registry/Structure/BaseCommand";
import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	PermissionFlagsBits
} from "discord.js";

export default class PinMenu extends BaseCommand {
	constructor() {
		super(
			new ContextMenuCommandBuilder()
				.setName("Pin Message")
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false)
				.setType(ApplicationCommandType.Message)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordMessageContextMenuCommandInteraction<"cached">
	) {
		if (!interaction.targetMessage.pinnable) {
			await interaction.reply({
				content: "Message isn't pinnable.",
				ephemeral: true
			});

			return;
		}

		try {
			await interaction.targetMessage.pin();
			await interaction.targetMessage.reply({
				content: `Messaged pinned by ${interaction.user}`
			});
		} catch (error) {
			await interaction.reply({
				content: "Couldn't pin message.",
				ephemeral: true
			});

			client.log(error, `${this.data.name} Menu`, 
					`**Channel:** <#${interaction.channel?.id}>
					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`); 
		}

		await interaction.reply({
			content: "Successfully pinned message.",
			ephemeral: true
		});
	}
}
