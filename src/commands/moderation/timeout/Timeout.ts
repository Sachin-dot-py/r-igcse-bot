import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import sendDm from "@/utils/sendDm";
import {
	Colors,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder
} from "discord.js";
import humanizeDuration from "humanize-duration";
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

		const latestPunishment = await Punishment.findOne({
			guildId: interaction.guildId
		}).sort({ when: -1 });

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

		const guildMember = await interaction.guild.members.fetch(user.id);

		if (!guildMember) {
			await interaction.reply({
				content: "User not found!",
				ephemeral: true
			});

			return;
		}

		if (guildMember.id === interaction.user.id) {
			await interaction.reply({
				content: "You cannot timeout yourself.",
				ephemeral: true
			});

			return;
		}

		if (guildMember.isCommunicationDisabled()) {
			await interaction.reply({
				content: "User is already timed out!",
				ephemeral: true
			});

			return;
		}

		const memberHighestRole = guildMember.roles.highest;
		const modHighestRole = interaction.member.roles.highest;

		if (memberHighestRole.comparePositionTo(modHighestRole) >= 0) {
			await interaction.reply({
				content:
					"You cannot timeout this user due to role hierarchy! (Role is higher or equal to yours)",
				ephemeral: true
			});
			return;
		}

		try {
			await guildMember.timeout(duration * 1000, reason);
			await sendDm(guildMember, {
				embeds: [
					new EmbedBuilder()
						.setTitle("Timeout")
						.setColor(Colors.Red)
						.setDescription(
							`You have been timed out in ${interaction.guild.name} for ${humanizeDuration(duration * 1000)} due to: \`${reason}\`. Your timeout will end <t:${Math.floor(Date.now() / 1000) + duration}:R>.`
						)
				]
			});
		} catch (error) {
			await interaction.reply({
				content: `Failed to timeout user ${error instanceof Error ? `(${error.message})` : ""}`,
				ephemeral: true
			});

			client.log(
				error,
				`${this.data.name} Command`,
				`**Channel:** <#${interaction.channel?.id}>
					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`
			);

			return;
		}

		await Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Timeout",
			caseId: caseNumber,
			duration,
			reason,
			points: duration >= 604800 ? 4 : duration >= 21600 ? 3 : 2,
			when: new Date()
		});

		const modEmbed = new EmbedBuilder()
			.setTitle(`Timeout | Case #${caseNumber}`)
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
				},
				{
					name: "Duration",
					value: `${humanizeDuration(duration * 1000)} (<t:${Math.floor(Date.now() / 1000) + duration}:R>)`
				}
			]);

		if (guildPreferences.modlogChannelId) {
			await Logger.channel(
				interaction.guild,
				guildPreferences.modlogChannelId,
				{
					embeds: [modEmbed]
				}
			);
		}

		await interaction.channel.send(
			`${user.username} has been timed out for ${reason} (Case #${caseNumber})`
		);
	}
}
