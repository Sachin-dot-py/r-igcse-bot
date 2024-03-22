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

export default class KickCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("kick")
				.setDescription("Kick a user from the server (for mods)")
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to kick")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("reason")
						.setDescription("Reason for kick")
						.setRequired(true)
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);

		if (user.id === interaction.user.id) {
			await interaction.reply({
				content:
					"You cannot kick yourself, ||consider leaving the server instead||.",
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
					"Please setup the bot using the command `/setup` first.",
				ephemeral: true
			});
			return;
		}

		const latestPunishment = await Punishment.findOne({
			guildId: interaction.guildId
		}).sort({ when: -1 });

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		const dmEmbed = new EmbedBuilder()
			.setAuthor({
				name: `You have been kicked from ${interaction.guild.name}!`,
				iconURL: client.user.displayAvatarURL()
			})
			.setDescription(
				`Hi there from ${interaction.guild.name}. You have been kicked from the server due to \`${reason}\`.`
			)
			.setColor(Colors.Red);

		const guildMember = interaction.guild.members.cache.get(user.id);
		if (guildMember) {
			if (!guildMember.kickable) {
				await interaction.reply({
					content: "I cannot kick this user! (Missing permissions)",
					ephemeral: true
				});
			}

			const memberHighestRole = guildMember.roles.highest;
			const modHighestRole = interaction.member.roles.highest;

			if (memberHighestRole.comparePositionTo(modHighestRole) >= 0) {
				await interaction.reply({
					content:
						"You cannot kick this user due to role hierarchy! (Role is higher or equal to yours)",
					ephemeral: true
				});
				return;
			}

			await sendDm(guildMember, {
				embeds: [dmEmbed]
			});
		}

		try {
			await interaction.guild.members.kick(user, reason);
		} catch (error) {
			await interaction.reply({
				content: `Failed to kick user ${error instanceof Error ? `(${error.message})` : ""}`,
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
			action: "Kick",
			caseId: caseNumber,
			reason,
			points: 0,
			when: new Date()
		});

		const modEmbed = new EmbedBuilder()
			.setTitle(`Kick | Case #${caseNumber}`)
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
			content: `Successfully kicked @${user.tag}`,
			ephemeral: true
		});
	}
}
