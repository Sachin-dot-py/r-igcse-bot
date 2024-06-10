import { Punishment } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import sendDm from "@/utils/sendDm";
import {
	Colors,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
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
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("reason")
						.setDescription("Reason for kick")
						.setRequired(true),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel || !interaction.channel.isTextBased()) return;

		await interaction.deferReply({
			ephemeral: true,
		});

		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);

		if (user.id === interaction.user.id) {
			interaction.editReply({
				content:
					"You cannot kick yourself, ||consider leaving the server instead||.",
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

		const latestPunishment = (
			await Punishment.find({
				guildId: interaction.guildId,
			}).sort({ when: -1 })
		)[0];

		const caseNumber = (latestPunishment?.caseId ?? 0) + 1;

		const dmEmbed = new EmbedBuilder()
			.setAuthor({
				name: `You have been kicked from ${interaction.guild.name}!`,
				iconURL: client.user.displayAvatarURL(),
			})
			.setDescription(
				`Hi there from ${interaction.guild.name}. You have been kicked from the server due to \`${reason}\`.`,
			)
			.setColor(Colors.Red);

		const guildMember = interaction.guild.members.cache.get(user.id);
		if (!guildMember) return;

		if (!guildMember.kickable) {
			interaction.editReply({
				content: "I cannot kick this user! (Missing permissions)",
			});

			return;
		}

		const memberHighestRole = guildMember.roles.highest;
		const modHighestRole = interaction.member.roles.highest;

		if (memberHighestRole.comparePositionTo(modHighestRole) >= 0) {
			interaction.editReply({
				content:
					"You cannot kick this user due to role hierarchy! (Role is higher or equal to yours)",
			});

			return;
		}

		sendDm(guildMember, {
			embeds: [dmEmbed],
		});

		try {
			await interaction.guild.members.kick(user, reason);
		} catch (error) {
			interaction.editReply({
				content: `Failed to kick user ${error instanceof Error ? `(${error.message})` : ""}`,
			});

			client.log(
				error,
				`${this.data.name} Command`,
				`**Channel:** <#${interaction.channel?.id}>
					**User:** <@${interaction.user.id}>
					**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
			);
		}

		Punishment.create({
			guildId: interaction.guild.id,
			actionAgainst: user.id,
			actionBy: interaction.user.id,
			action: "Kick",
			caseId: caseNumber,
			reason,
			points: 0,
			when: new Date(),
		});

		if (guildPreferences.modlogChannelId) {
			const modEmbed = new EmbedBuilder()
				.setTitle(`Kick | Case #${caseNumber}`)
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

			Logger.channel(
				interaction.guild,
				guildPreferences.modlogChannelId,
				{
					embeds: [modEmbed],
				},
			);
		}

		interaction.editReply({
			content:
				"https://tenor.com/view/asdf-movie-punt-kick-donewiththis-gif-26537188",
		});
		interaction.channel.send(`${user.username} has been kicked.`);
	}
}
