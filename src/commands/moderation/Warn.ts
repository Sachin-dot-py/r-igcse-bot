import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class WarnCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("warn")
				.setDescription("Warn a user (for mods)")
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to warn")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("reason")
						.setDescription("Reason for warn")
						.setRequired(true),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
				.setDMPermission(false),
		);
	}

	// TODO: Warn Command
	async execute(
		client: DiscordClient,
		interaction: DiscordChatInputCommandInteraction,
	) {
		if (!interaction.guild) return;

		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);

		if (user.id === interaction.user.id) {
			await interaction.reply({
				content: "You cannot warn yourself!",
				ephemeral: true,
			});
			return;
		}

		// const modlogChannelId = (
		// 	await GuildPreferencesCache.get(interaction.guild.id)
		// )?.modlogChannelId;

		// if (modlogChannelId) {
		// 	const modlogChannel =
		// 		await interaction.guild.channels.fetch(modlogChannelId);
		// }
	}
}
