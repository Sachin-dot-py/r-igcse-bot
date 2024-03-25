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
			const pinNo = Array.from(
				(await interaction.channel?.messages.fetchPinned()) || []
			).length;
			if (pinNo >= 50) {
				await interaction.reply({
					content:
						"Heads up! We've hit the pin limit for this channel. You can unpin some previously pinned messages to free up space."
				});
				return;
			}

			await interaction.reply({
				content: "Couldn't pin message.",
				ephemeral: true
			});

			client.log(
				error,
				`${this.data.name} Menu`,
				`**Channel:** <#${interaction.channel?.id}>
					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`
			);
		}

		await interaction.reply({
			content: "Successfully pinned message.",
			ephemeral: true
		});
	}
}
