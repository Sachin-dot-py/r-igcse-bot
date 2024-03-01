import { GuildPreferences } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { SlashCommandBuilder } from "discord.js";

export default class SetGuildPreferenceCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("set_preferences")
				.setDescription("Set server preferences (for mods)")
				.addBooleanOption((option) =>
					option
						.setName("rep_enabled")
						.setDescription("Enable reputation system")

						.setRequired(true),
				)
				.addChannelOption((option) =>
					option
						.setName("modlog_channel")
						.setDescription("Channel to log moderation actions")
						.setRequired(true),
				)
				.addChannelOption((option) =>
					option
						.setName("botlog_channel")
						.setDescription("Channel to log bot errors")
						.setRequired(true),
				)
				.addChannelOption((option) =>
					option
						.setName("welcome_channel")
						.setDescription("Channel to welcome new members")
						.setRequired(true),
				)
				.addRoleOption((option) =>
					option
						.setName("admin_role")
						.setDescription("Probably you")
						.setRequired(true),
				)
				.addRoleOption((option) =>
					option
						.setName("moderator_role")
						.setDescription("usually over weight")
						.setRequired(true),
				)
				.addRoleOption((option) =>
					option
						.setName("chat_moderator_role")
						.setDescription("also usually over weight")
						.setRequired(true),
				)
				.addRoleOption((option) =>
					option
						.setName("ig_helper_role")
						.setDescription("IGCSE Helper Role")
						.setRequired(true),
				)
				.addRoleOption((option) =>
					option
						.setName("al_helper_role")
						.setDescription("A-Level Helper Role")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("ban_appeal_form_link")
						.setDescription("Link to ban appeal form")
						.setRequired(true),
				),
			// .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
			// .setDMPermission(false),
		);
	}

	// TODO: improve the command?
	async execute(
		client: DiscordClient,
		interaction: DiscordChatInputCommandInteraction,
	) {
		if (!interaction.guild) return;

		const repEnabled = interaction.options.getBoolean("rep_enabled", true);
		const modlogChannel = interaction.options.getChannel(
			"modlog_channel",
			true,
		);
		const botlogChannel = interaction.options.getChannel(
			"botlog_channel",
			true,
		);
		const welcomeChannel = interaction.options.getChannel(
			"welcome_channel",
			true,
		);
		const adminRole = interaction.options.getRole("admin_role", true);
		const moderatorRole = interaction.options.getRole("moderator_role", true);
		const chatModRole = interaction.options.getRole(
			"chat_moderator_role",
			true,
		);
		const igHelperRole = interaction.options.getRole("ig_helper_role", true);
		const alHelperRole = interaction.options.getRole("al_helper_role", true);
		const banAppealFormLink = interaction.options.getString(
			"ban_appeal_form_link",
			true,
		);

		const prefs = await GuildPreferences.findOneAndUpdate(
			{
				guildId: interaction.guild.id,
			},
			{
				$set: {
					repEnabled,
					modlogChannelId: modlogChannel.id,
					botlogChannelId: botlogChannel.id,
					welcomeChannelId: welcomeChannel.id,
					adminRoleId: adminRole.id,
					moderatorRoleId: moderatorRole.id,
					igHelperRoleId: igHelperRole.id,
					alHelperRoleId: alHelperRole.id,
					chatModRoleId: chatModRole.id,
					banAppealFormLink,
				},
			},
			{
				upsert: true,
			},
		);

		if (!prefs) {
			await interaction.reply({
				content: "Failed to update preferences",
				ephemeral: true,
			});
			return;
		}

		// await GuildPreferencesCache.createAndSave({
		// 	$id: interaction.guild.id,
		// 	repEnabled,
		// 	modlogChannelId: modlogChannel.id,
		// 	botlogChannelId: botlogChannel.id,
		// 	welcomeChannelId: welcomeChannel.id,
		// 	adminRoleId: adminRole.id,
		// 	moderatorRoleId: moderatorRole.id,
		// 	igHelperRoleId: igHelperRole.id,
		// 	alHelperRoleId: alHelperRole.id,
		// 	chatModRoleId: chatModRole.id,
		// 	banAppealFormLink,
		// 	repDisabledChannelIds: prefs.repDisabledChannelIds,
		// });

		await interaction.reply({
			content: "Preferences updated",
			ephemeral: true,
		});
	}
}
