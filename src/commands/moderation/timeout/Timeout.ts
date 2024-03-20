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
import parse from "parse-duration";

export default class TimeoutCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("timeout")
				.setDescription("Timeout a user (for mods)")
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to timeout")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("reason")
						.setDescription("Reason for timeout")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("duration")
						.setDescription("Duration for timeout")
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
		const durationString = interaction.options.getString("duration", true);

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

		const latestPunishment = await Punishment.findOne()
			.sort({ when: -1 });
		
		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		const duration = ["unspecified", "permanent", "undecided"].some((s) =>
			durationString.includes(s)
		)
			? 2419200
			: parse(durationString, "second") ?? 86400;

		if (duration <= 0) {
			await interaction.reply({
				content: "Invalid duration!",
				ephemeral: true
			});

			return;
		}

		try {
			const member = await interaction.guild.members.fetch(user.id);

			await member.timeout(duration, reason);
		} catch (error) {
			await interaction.reply({
				content: "Failed to timeout user",
				ephemeral: true
			});

			client.log(error, `${this.data.name} Command`, [
				{ name: "User ID", value: interaction.user.id }
			]);
		}

		await Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Timeout",
			caseId: caseNumber,
			duration,
			reason,
			points: duration >= 604800 ? 4 : duration >= 21600 ? 3 : 2
		});

		const modEmbed = new EmbedBuilder()
			.setTitle(`Timeout | Case #${caseNumber}`)
			.setColor(Colors.Red)
			.addFields([
				{
					name: "User",
					value: `${user.tag} (${user.id})`,
					inline: true
				},
				{
					name: "Moderator",
					value: `${interaction.user.tag} (${interaction.user.id})`,
					inline: true
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
			content: `Successfully timed out @${user.displayName}`,
			ephemeral: true
		});
	}
}
