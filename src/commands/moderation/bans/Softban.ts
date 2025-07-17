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
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import parse from "parse-duration";
import humanizeDuration from "humanize-duration";

export default class SoftbanCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("softban")
				.setDescription(
					"Softban a user (ban and immediately unban to delete messages)",
				)
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("User to softban")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("reason")
						.setDescription("Reason for softban")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("delete_messages")
						.setDescription(
							"How far back to delete messages (e.g., 1h, 1w, default: 1d)",
						)
						.setRequired(false),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel || !interaction.channel.isTextBased()) return;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);
		const deleteMessagesString =
			interaction.options.getString("delete_messages", false) ?? "1d";

		if (user.id === interaction.user.id) {
			await interaction.editReply({
				content: "You can't softban yourself!",
			});
			return;
		}

		const guildMember = await interaction.guild.members
			.fetch(user.id)
			.catch(() => null);
		if (guildMember) {
			if (!guildMember.bannable) {
				await interaction.editReply({
					content:
						"I cannot softban this user. (Missing permissions)",
				});
				return;
			}

			const memberHighestRole = guildMember.roles.highest;
			const modHighestRole = interaction.member.roles.highest;

			if (memberHighestRole.comparePositionTo(modHighestRole) >= 0) {
				await interaction.editReply({
					content:
						"You cannot softban this user due to role hierarchy! (Role is higher or equal to yours)",
				});
				return;
			}
		}

		// Check if user is already banned
		if (await interaction.guild.bans.fetch(user.id).catch(() => null)) {
			await interaction.editReply({ content: "User is already banned." });
			return;
		}

		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId,
		);
		if (!guildPreferences) {
			await interaction.editReply({
				content:
					"Please configure the bot using `/setup` command first.",
			});
			return;
		}

		// Attempt to DM the user before banning
		if (guildMember) {
			const dmEmbed = new EmbedBuilder()
				.setTitle(
					`You have been softbanned from ${interaction.guild.name}`,
				)
				.setDescription(
					`You have been softbanned from **${interaction.guild.name}** for: \`${reason}\`. You may rejoin the server, but your recent messages have been deleted.`,
				)
				.setColor(Colors.Red);
			try {
				await sendDm(guildMember, { embeds: [dmEmbed] });
			} catch {}
		}

		// Parse deleteMessagesString to seconds (default 1d)
		let deleteMessageSeconds =
			parse(deleteMessagesString, "second") ?? 86400;
		if (deleteMessageSeconds < 1) deleteMessageSeconds = 1;
		if (deleteMessageSeconds > 604800) deleteMessageSeconds = 604800;
		const humanDuration = humanizeDuration(deleteMessageSeconds * 1000, {
			largest: 2,
			round: true,
		});

		// Ban the user
		try {
			await interaction.guild.bans.create(user, {
				reason: `${reason} | By: ${interaction.user.tag} (softban)`,
				deleteMessageSeconds,
			});
		} catch (error) {
			await interaction.editReply({
				content: `Failed to ban user: ${error instanceof Error ? error.message : error}`,
			});
			client.log(
				error,
				`${this.data.name} Command`,
				`**Channel:** <#${interaction.channel?.id} >\n**User:** <@${interaction.user.id}>\n**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
			);
			return;
		}

		// Unban the user
		try {
			await interaction.guild.bans.remove(
				user,
				`Softban unban by ${interaction.user.tag}`,
			);
		} catch (error) {
			await interaction.editReply({
				content: `User banned, but failed to unban: ${error instanceof Error ? error.message : error}`,
			});
			client.log(
				error,
				`${this.data.name} Command`,
				`**Channel:** <#${interaction.channel?.id} >\n**User:** <@${interaction.user.id}>\n**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
			);
			return;
		}

		const caseNumber =
			(await Punishment.find({ guildId: interaction.guildId })).length +
			1;

		// Create punishment record
		try {
			await Punishment.create({
				guildId: interaction.guild.id,
				actionAgainst: user.id,
				actionBy: interaction.user.id,
				action: "Softban",
				caseId: caseNumber,
				reason,
				points: 0,
				when: new Date(),
			});
		} catch (error) {
			await interaction.editReply({
				content: `Softban succeeded, but failed to log punishment: ${error instanceof Error ? error.message : error}`,
			});
			client.log(
				error,
				`${this.data.name} Command`,
				`**Channel:** <#${interaction.channel?.id} >\n**User:** <@${interaction.user.id}>\n**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
			);
		}

		await interaction.channel.send(
			`${user.username} has been softbanned. (Case #${caseNumber})`,
		);

		if (guildPreferences.modlogChannelId) {
			try {
				const modEmbed = new EmbedBuilder()
					.setTitle(`Softban | Case #${caseNumber}`)
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
						{ name: "Reason", value: reason },
						{ name: "Deleted Messages", value: humanDuration },
					])
					.setTimestamp();

				await logToChannel(
					interaction.guild,
					guildPreferences.modlogChannelId,
					{
						embeds: [modEmbed],
					},
				);
			} catch (error) {
				await interaction.followUp({
					content: `Softban succeeded, but failed to log to modlog: ${error instanceof Error ? error.message : error}`,
					ephemeral: true,
				});
				client.log(
					error,
					`${this.data.name} Command`,
					`**Channel:** <#${interaction.channel?.id} >\n**User:** <@${interaction.user.id}>\n**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
				);
			}
		}

		interaction.editReply({
			content: `Softbanned ${user.username} for ${reason}. Deleted messages from the last ${humanDuration}.`,
		});
	}
}
