import { GuildPreferences, type IGuildPreferences } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
	ApplicationCommandOptionType,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";

const setPreference = async <T extends keyof IGuildPreferences>(
	guildId: string,
	preference: T,
	value: IGuildPreferences[T],
) => {
	const $set: Partial<IGuildPreferences> = {};

	$set[preference] = value;

	const prefs = await GuildPreferences.updateOne(
		{
			guildId: guildId,
		},
		{
			$set,
		},
		{
			upsert: true,
		},
	);

	if (prefs.modifiedCount + prefs.upsertedCount === 0)
		throw new Error("No documents modified or upserted");
};

export default class SetGuildPreferenceCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("set_preferences")
				.setDescription("Set server preferences (for mods)")
				.addBooleanOption((option) =>
					option
						.setName("rep_enabled")
						.setDescription("Whether to enable reputation")
						.setRequired(false),
				)
				.addChannelOption((option) =>
					option
						.setName("modlog_channel")
						.setDescription("The channel to log moderation actions")
						.setRequired(false),
				)
				.addChannelOption((option) =>
					option
						.setName("botlog_channel")
						.setDescription("The channel to log bot actions")
						.setRequired(false),
				)
				.addChannelOption((option) =>
					option
						.setName("welcome_channel")
						.setDescription("The channel to welcome new members")
						.setRequired(false),
				)
				.addChannelOption((option) =>
					option
						.setName("behaviorlof_channel")
						.setDescription("The channel to log behavior logs")
						.setRequired(false),
				)
				.addChannelOption((option) =>
					option
						.setName("warnlog_channel")
						.setDescription("The channel to log warns")
						.setRequired(false),
				)
				.addChannelOption((option) =>
					option
						.setName("action_required_channel")
						.setDescription(
							"The channel to send users with >= 10 infraction points",
						)
						.setRequired(false),
				)
				.addChannelOption((option) =>
					option
						.setName("mod_feedback_channel")
						.setDescription("The channel to send mod feedback to")
						.setRequired(false),
				)
				.addChannelOption((option) =>
					option
						.setName("confession_approval_channel")
						.setDescription("The channel to send confessions to for approval")
						.setRequired(false),
				)
				.addRoleOption((option) =>
					option
						.setName("admin_role")
						.setDescription("The role for admins")
						.setRequired(false),
				)
				.addRoleOption((option) =>
					option
						.setName("moderator_role")
						.setDescription("The role for moderators")
						.setRequired(false),
				)
				.addRoleOption((option) =>
					option
						.setName("chat_moderator_role")
						.setDescription("The role for chat moderators")
						.setRequired(false),
				)
				.addRoleOption((option) =>
					option
						.setName("ig_helper_role")
						.setDescription("The role for IG helpers")
						.setRequired(false),
				)
				.addRoleOption((option) =>
					option
						.setName("al_helper_role")
						.setDescription("The role for AL helpers")
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("modmail_channel")
						.setDescription("The channel for modmail")
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("chatmod_applications_channel")
						.setDescription("The channel for chatmod applications")
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("confessions_channel")
						.setDescription("The channel for confessions")
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("counting_channel")
						.setDescription("The channel for the counting game")
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("hotm_results_channel")
						.setDescription("The channel for the HOTM results")
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("ban_appeal_form_link")
						.setDescription("The link to the ban appeal form")
						.setRequired(false),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
				.setDMPermission(false),
		);
	}

	// TODO: improve the command?
	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		await interaction.deferReply();

		try {
			for (const stringOrBooleanOption of interaction.options.data.filter(
				(x) =>
					x.type === ApplicationCommandOptionType.String ||
					x.type === ApplicationCommandOptionType.Boolean,
			)) {
				if (stringOrBooleanOption.value === undefined) return;

				await setPreference(
					interaction.guild.id,
					stringOrBooleanOption.name as keyof IGuildPreferences,
					stringOrBooleanOption.value as string | boolean,
				);
			}

			for (const channelOrRoleOption of interaction.options.data.filter(
				(x) =>
					x.type === ApplicationCommandOptionType.Channel ||
					x.type === ApplicationCommandOptionType.Role,
			)) {
				if (!channelOrRoleOption.channel && !channelOrRoleOption.role) return;

				await setPreference(
					interaction.guild.id,
					channelOrRoleOption.name as keyof IGuildPreferences,
					channelOrRoleOption.channel
						? channelOrRoleOption.channel.id
						: channelOrRoleOption.role!.id,
				);
			}

			await interaction.followUp({
				content: "Preferences updated",
				ephemeral: true,
			});
		} catch (error) {
			await interaction.followUp({
				content: "Failed to update preferences",
				ephemeral: true,
			});
			return;
		}
	}
}
