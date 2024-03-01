import { logger } from "@/index";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class KickCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("kick")
				.setDescription("Kick a user from the server (for mods)")
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to kick")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("reason")
						.setDescription("Reason for kick")
						.setRequired(true),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
				.setDMPermission(false),
		);
	}

	async execute(
		interaction: DiscordChatInputCommandInteraction,
		client: DiscordClient,
	) {
		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);

		// if (user.id === interaction.user.id) {
		//     await interaction.reply({
		//         content: 'You cannot kick yourself!',
		//         ephemeral: true,
		//     });
		//     return;
		// }

		try {
			await interaction.guild?.members.kick(user, reason);

			await user.send(
				`Hi there from ${interaction.guild?.name}. You have been kicked from the server due to '${reason}'.`,
			);

			await interaction.reply({
				content: `Successfully kicked @${user.displayName}`,
				ephemeral: true,
			});
		} catch (e) {
			await interaction.reply({
				content: "Failed to kick user",
				ephemeral: true,
			});

			logger.error(e);
			return;
		}
	}
}
