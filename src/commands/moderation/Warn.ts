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

		await interaction.deferReply({
			flags: 64,
		});

		const guildMember = await interaction.guild.members.fetch(user.id);

		const memberHighestRole = guildMember.roles.highest;
		const modHighestRole = interaction.member.roles.highest;

		if (memberHighestRole.comparePositionTo(modHighestRole) >= 0) {
			interaction.editReply({
				content:
					"You cannot warn this user due to role hierarchy! (Role is higher or equal to yours)",
			});
			return;
		}

		if (!guildMember) {
			interaction.editReply({
				content: "User not found in server.",
			});
			return;
		}

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

		const caseNumber =
			(
				await Punishment.find({
					guildId: interaction.guildId,
				})
			).length + 1;

		interaction.channel.send(
			`${user.username} has been warned for ${reason} (Case #${caseNumber})`,
		);

		await Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Warn",
			caseId: caseNumber,
			reason,
			points: 1,
			when: new Date(),
		});

		if (guildPreferences.modlogChannelId) {
			const modEmbed = new EmbedBuilder()
				.setTitle(`Warn | Case #${caseNumber}`)
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
				])
				.setTimestamp();

			logToChannel(interaction.guild, guildPreferences.modlogChannelId, {
				embeds: [modEmbed],
			});
		}

		sendDm(guildMember, {
			embeds: [
				new EmbedBuilder()
					.setTitle("Warn")
					.setColor(Colors.Red)
					.setDescription(
						`You have been warned in ${interaction.guild.name} for: \`${reason}\`.`,
					),
			],
		});

		const punishments = await Punishment.find({
			guildId: interaction.guildId,
			actionAgainst: user.id,
		}).sort({ when: 1 });

		let totalPoints = 0;

		for (const { points } of punishments) {
			if (points) totalPoints += points;
		}

		const warnReply =
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

		interaction.editReply(warnReply);
	}
}
