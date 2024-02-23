import { GuildPreferences } from "@/mongo";
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
		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);

		if (user.id === interaction.user.id) {
			await interaction.followUp({
				content: "You cannot warn yourself!",
				ephemeral: true,
			});
			return;
		}

		const warnlogChannelId = (
			await GuildPreferences.findOne({
				guildId: interaction.guildId,
			}).exec()
		)?.warnlogChannel;

		if (warnlogChannelId) {
			const warnlogChannel =
				await interaction.guild?.channels.fetch(warnlogChannelId);
		}
	}
}
