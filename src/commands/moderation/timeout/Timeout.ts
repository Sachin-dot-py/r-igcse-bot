import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { logToChannel } from "@/utils/Logger";
import sendDm from "@/utils/sendDm";
import {
	Colors,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
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
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("duration")
						.setDescription("Duration for timeout (from now)")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("reason")
						.setDescription("Reason for timeout")
						.setRequired(true),
				)
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ModerateMembers,
				)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel || !interaction.channel.isTextBased()) return;

		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);
		const durationString = interaction.options.getString("duration", true);

		await interaction.deferReply({
			ephemeral: true,
		});

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);

		if (!guildPreferences) {
			interaction.editReply({
				content:
					"Please setup the bot using the command `/setup` first.",
			});
			return;
		}

		const duration = ["unspecified", "permanent", "undecided"].some((s) =>
			durationString.includes(s),
		)
			? 2419200
			: parse(durationString, "second") ?? 86400;

		if (duration < 60 || duration > 2419200) {
			interaction.editReply({
				content: "Duration must be between 1 minute and 28 days",
			});

			return;
		}

		const guildMember = await interaction.guild.members.fetch(user.id);

		if (!guildMember) {
			interaction.editReply({
				content: "User not found!",
			});

			return;
		}

		if (guildMember.id === interaction.user.id) {
			interaction.editReply({
				content: "You cannot timeout yourself.",
			});

			return;
		}

		const memberHighestRole = guildMember.roles.highest;
		const modHighestRole = interaction.member.roles.highest;

		if (memberHighestRole.comparePositionTo(modHighestRole) >= 0) {
			interaction.editReply({
				content:
					"You cannot timeout this user due to role hierarchy! (Role is higher or equal to yours)",
			});
			return;
		}

		try {
			await guildMember.timeout(duration * 1000, reason);
		} catch (error) {
			interaction.editReply({
				content: `Failed to timeout user ${
					error instanceof Error ? `(${error.message})` : ""
				}`,
			});

			client.log(
				error,
				`${this.data.name} Command`,
				`**Channel:** <#${interaction.channel?.id}>
						**User:** <@${interaction.user.id}>
						**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
			);

			return;
		}

		const latestTimeout = (
			await Punishment.find({
				guildId: interaction.guildId,
				actionAgainst: guildMember.id,
				action: "Timeout",
			}).sort({ when: -1 })
		)[0];

		const punishments = await Punishment.find({
			guildId: interaction.guildId,
			actionAgainst: user.id,
		}).sort({ when: 1 });

		const points = duration >= 604800 ? 4 : duration >= 21600 ? 3 : 2;

		let totalPoints = points;

		for (const { points } of punishments) {
			if (points) totalPoints += points;
		}

		if (
			guildMember.isCommunicationDisabled() &&
			latestTimeout?.duration &&
			latestTimeout.when.getTime() + latestTimeout.duration * 1000 >
				Date.now()
		) {
			const newEndTime = Date.now() + duration * 1000;

			const time = Math.floor(newEndTime / 1000);

			sendDm(guildMember, {
				embeds: [
					new EmbedBuilder()
						.setTitle("Timeout Duration Modified")
						.setColor(Colors.Red)
						.setDescription(
							`Your timeout in ${
								interaction.guild.name
							} has been modified to last ${humanizeDuration(
								duration * 1000,
							)} from now due to *${reason}*. Your timeout will end <t:${time}:R>.`,
						),
				],
			});

			const previousReason = latestTimeout.reason;

			await latestTimeout.updateOne({
				actionBy: interaction.user.id,
				reason: `${previousReason}, ${reason}`,
				duration: duration,
				points: duration >= 604800 ? 4 : duration >= 21600 ? 3 : 2,
			});

			const modEmbed = new EmbedBuilder()
				.setTitle(
					`Timeout Duration Modified | Case #${latestTimeout.caseId}`,
				)
				.setColor(Colors.Red)
				.addFields([
					{
						name: "User",
						value: `${user.tag} (${user.id})`,
						inline: false,
					},
					{
						name: "Moderator",
						value: `${interaction.user.tag} (${interaction.user.id})`,
						inline: false,
					},
					{
						name: "Reason",
						value: reason,
					},
					{
						name: "Duration",
						value: `${humanizeDuration(duration * 1000)} (<t:${time}:R>)`,
					},
				]);

			if (guildPreferences.modlogChannelId) {
				logToChannel(
					interaction.guild,
					guildPreferences.modlogChannelId,
					{
						embeds: [modEmbed],
					},
				);
			}

			interaction.editReply({
				content: `changed user's timeout duration rahhhhhh \nthey have ${totalPoints} points`,
			});
			interaction.channel.send(
				`${user.username}'s timeout has been modified due to *${reason}*, it will end at <t:${time}:f>. (<t:${time}:R>)`,
			);
			return;
		}

		const caseNumber =
			(
				await Punishment.find({
					guildId: interaction.guildId,
				})
			).length + 1;

		Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Timeout",
			caseId: caseNumber,
			duration,
			reason,
			points,
			when: new Date(),
		});

		const modEmbed = new EmbedBuilder()
			.setTitle(`Timeout | Case #${caseNumber}`)
			.setColor(Colors.Red)
			.addFields([
				{
					name: "User",
					value: `${user.tag} (${user.id})`,
					inline: false,
				},
				{
					name: "Moderator",
					value: `${interaction.user.tag} (${interaction.user.id})`,
					inline: false,
				},
				{
					name: "Reason",
					value: reason,
				},
				{
					name: "Duration",
					value: `${humanizeDuration(duration * 1000)} (<t:${
						Math.floor(Date.now() / 1000) + duration
					}:R>)`,
				},
			]);

		if (guildPreferences.modlogChannelId) {
			logToChannel(interaction.guild, guildPreferences.modlogChannelId, {
				embeds: [modEmbed],
			});
		}

		const timeoutReply =
			totalPoints >= 10
				? {
						embeds: [
							new EmbedBuilder()
								.setTitle("ACTION REQUIRED")
								.setColor(Colors.Red)
								.setDescription(
									`**${user.username} has ${totalPoints} points**`,
								),
						],
					}
				: {
						embeds: [
							new EmbedBuilder()
								.setColor(Colors.Blurple)
								.setDescription(
									`${user.username} has ${totalPoints} points`,
								),
						],
					};

		interaction.editReply(timeoutReply);

		const time = Math.floor(Date.now() / 1000 + duration);
		interaction.channel.send(
			`${user.username} has been timed out for *${reason}* until <t:${time}:f>. (<t:${time}:R>) (Case #${caseNumber})`,
		);
	}
}
