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
			ephemeral: true,
		});

		const guildMember = await interaction.guild.members.fetch(user.id);

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

		const userPunishments = await Punishment.find({
			guildId: interaction.guildId,
			actionAgainst: user.id,
		}).sort({ when: -1 });

		const caseNumber = (userPunishments[0]?.caseId ?? 0) + 1;

		const newPunishment = await Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Warn",
			caseId: caseNumber,
			reason,
			points: 1,
			when: new Date(),
		});

		const totalPoints = userPunishments.reduce(
			(sum, punishment) => sum + punishment.points,
			0,
		) + 1;

		if (totalPoints > 10) {
			const lastInfraction = userPunishments[0];
			const previousBans = userPunishments.filter(
				(punishment) => punishment.action === "Ban",
			);
			
			if (guildPreferences.actionRequiredChannelId) {
				const actionReqEmbed = new EmbedBuilder()
					.setTitle(`User Action Required (${totalPoints})`)
					.setColor(Colors.Red)
					.setAuthor({ name: guildMember.user.tag, iconURL: guildMember.user.displayAvatarURL() })
					.addFields([
						{
							name: "User",
							value: `<@${guildMember.user.id}> (${guildMember.user.id})`,
							inline: false,
						},				
						{
							name: "Last Infraction Details",
							value: lastInfraction
								? `→ Case ID: **#${lastInfraction.caseId}**\n → Action Taken: **${lastInfraction.action}**\n → Reason: **${lastInfraction.reason}**\n → When: <t:${Math.floor(
									new Date(lastInfraction.when).getTime() / 1000,
								)}:F> (<t:${Math.floor(
									new Date(lastInfraction.when).getTime() / 1000,
								)}:R>)`
								: "No previous infractions",
							inline: false,
						},
						{
							name: "Previous Bans",
							value: previousBans.length
								? previousBans
										.map(
											(ban) =>
												`<t:${Math.floor(
													new Date(ban.when).getTime() /
														1000,
												)}:F>`,
										)
										.join("\n")
								: "None",
							inline: false,
						},
					]);

				
				logToChannel(interaction.guild, guildPreferences.actionRequiredChannelId, {
					embeds: [actionReqEmbed],
					});
				}
			}

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

		interaction.editReply({
			content:
				"https://tenor.com/view/judges-warn-judge-judy-pointing-gif-15838639",
		});
		interaction.channel.send(
			`${user.username} has been warned for ${reason} (Case #${caseNumber})`,
		);
	}
}
