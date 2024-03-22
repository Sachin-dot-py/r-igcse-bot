import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import sendDm from "@/utils/sendDm";
import Logger from "@/utils/Logger";
import {
	Colors,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder
} from "discord.js";

export default class BanCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("ban")
				.setDescription("Ban a user from the server (for mods)")
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to ban")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("reason")
						.setDescription("Reason for ban")
						.setRequired(true)
				)
				.addIntegerOption((option) =>
					option
						.setName("delete_messages")
						.setDescription("Days to delete messages for")
						.setMaxValue(7)
						.setMinValue(0)
						.setRequired(false)
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);
		const deleteMessagesDays =
			interaction.options.getInteger("delete_messages", false) ?? 0;

		if (user.id === interaction.user.id) {
			await interaction.reply({
				content:
					"Well hey, you can't ban yourself ||but **please** ask someone else to do it||!",
				ephemeral: true
			});
			return;
		}

		if (interaction.guild.bans.cache.has(user.id)) {
			await interaction.reply({
				content: "I cannot ban a user that's already banned.",
				ephemeral: true
			});
			return;
		}

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		if (!guildPreferences) {
			await interaction.reply({
				content:
					"Please configure the bot using `/setup` command first.",
				ephemeral: true
			});
			return;
		}

		const latestPunishment = await Punishment.findOne().sort({ when: -1 });

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		const dmEmbed = new EmbedBuilder()
			.setTitle(`You have been banned from ${interaction.guild.name}!`)
			.setDescription(
				`You have been banned from **${interaction.guild.name}** due to \`${reason}\`. ${guildPreferences.banAppealFormLink ? `Please fill the appeal form [here](${guildPreferences.banAppealFormLink}) to appeal your ban.` : ""}`
			)
			.setColor(Colors.Red);

		const guildMember = await interaction.guild.members.cache.get(user.id);

		if (guildMember) {
			if (!guildMember.bannable) {
				await interaction.reply({
					content: "I cannot ban this user. (Missing permissions)",
					ephemeral: true
				});
				return;
			}

			const memberHighestRole = guildMember.roles.highest;
			const modHighestRole = interaction.member.roles.highest;

			if (memberHighestRole.comparePositionTo(modHighestRole) >= 0) {
				await interaction.reply({
					content:
						"You cannot ban this user due to role hierarchy! (Role is higher or equal to yours)",
					ephemeral: true
				});
				return;
			}

			await sendDm(guildMember, {
				embeds: [dmEmbed]
			});
		}

		try {
			await interaction.guild.bans.create(user, {
				reason: reason,
				deleteMessageSeconds: deleteMessagesDays * 86400
			});
		} catch (error) {
			await interaction.reply({
				content: `Failed to ban user ${error instanceof Error ? `(${error.message})` : ""}`,
				ephemeral: true
			});

			client.log(error, `${this.data.name} Command`, [
				{ name: "User ID", value: interaction.user.id }
			]);
			return;
		}

		await Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Ban",
			caseId: caseNumber,
			reason,
			points: 0
		});

		if (guildPreferences.modlogChannelId) {
			const modEmbed = new EmbedBuilder()
				.setTitle(`Ban | Case #${caseNumber}`)
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

			await Logger.channel(
				interaction.guild,
				guildPreferences.modlogChannelId,
				{
					embeds: [modEmbed]
				}
			);
		}

		await interaction.reply({
			content: `Successfully banned ${user.tag}`,
			ephemeral: true
		});
	}
}
