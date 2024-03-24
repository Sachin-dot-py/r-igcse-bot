import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import {
	Colors,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder
} from "discord.js";

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
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("reason")
						.setDescription("Reason for warn")
						.setRequired(true)
				)
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ModerateMembers
				)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		if (!guildPreferences) {
			await interaction.reply({
				content:
					"Please setup the bot using the command `/setup` first.",
				ephemeral: true
			});
			return;
		}

		const latestPunishment = await Punishment.findOne({
			guildId: interaction.guildId
		}).sort({ when: -1 });

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		await Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Warn",
			caseId: caseNumber,
			reason,
			points: 1,
			when: new Date()
		});

		const modEmbed = new EmbedBuilder()
			.setTitle(`Warn | Case #${caseNumber}`)
			.setColor(Colors.Red)
			.addFields([
				{
					name: "User",
					value: `${user.tag} (${user.id})`,
					inline: false
				},
				{
					name: "Moderator",
					value: `${interaction.user.tag} (${interaction.user.id})`,
					inline: false
				},
				{
					name: "Reason",
					value: reason
				}
			])
			.setTimestamp();

		if (guildPreferences.modlogChannelId) {
			await Logger.channel(
				interaction.guild,
				guildPreferences.modlogChannelId,
				{
					embeds: [modEmbed]
				}
			);
		}

		await interaction.reply({
			content: `${user.username} has been warned for ${reason} (Case #${caseNumber})`,
			ephemeral: true
		});
	}
}
