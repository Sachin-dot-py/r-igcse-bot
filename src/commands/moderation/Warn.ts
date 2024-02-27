import { GuildPreferencesCache } from "@/redis";
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
	async execute(interaction: DiscordChatInputCommandInteraction) {
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

		const warnlogChannelId = (
			await GuildPreferencesCache.get(interaction.guild.id)
		)?.warnlogChannelId;

		if (warnlogChannelId) {
			const warnlogChannel =
				await interaction.guild.channels.fetch(warnlogChannelId);
		}
	}
}
