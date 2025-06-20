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
import parse from "parse-duration";
import humanizeDuration from "humanize-duration";

export default class SoftbanCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("softban")
				.setDescription("Softban a user (ban and immediately unban to delete messages)")
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
						.setDescription("How far back to delete messages (e.g., 1d, 1h, 1w)")
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
		await interaction.deferReply();

		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason", true);
		const deleteMessagesString = interaction.options.getString("delete_messages", false) ?? "1d";

		if (user.id === interaction.user.id) {
			await interaction.editReply({
				content: "You can't softban yourself!",
			});
			return;
		}

		const guildMember = await interaction.guild.members.fetch(user.id).catch(() => null);
		if (guildMember) {
			if (!guildMember.bannable) {
				await interaction.editReply({
					content: "I cannot softban this user. (Missing permissions)",
				});
				return;
			}

			const memberHighestRole = guildMember.roles.highest;
			const modHighestRole = interaction.member.roles.highest;

			if (memberHighestRole.comparePositionTo(modHighestRole) >= 0) {
				await interaction.editReply({
					content: "You cannot softban this user due to role hierarchy! (Role is higher or equal to yours)",
				});
				return;
			}
		}

		// Check if user is already banned
		if (await interaction.guild.bans.fetch(user.id).catch(() => null)) {
			await interaction.editReply({ content: "User is already banned." });
			return;
		}

		// Attempt to DM the user before banning
		if (guildMember) {
			const dmEmbed = new EmbedBuilder()
				.setTitle(`You have been softbanned from ${interaction.guild.name}`)
				.setDescription(
					`You have been softbanned from **${interaction.guild.name}** for: \`${reason}\`. You may rejoin the server, but your recent messages have been deleted.`
				)
				.setColor(Colors.Red);
			try {
				await sendDm(guildMember, { embeds: [dmEmbed] });
			} catch {}
		}

		// Parse deleteMessagesString to seconds (default 1d)
		let deleteMessageSeconds = parse(deleteMessagesString, "second") ?? 86400;
		if (deleteMessageSeconds < 1) deleteMessageSeconds = 1;
		if (deleteMessageSeconds > 604800) deleteMessageSeconds = 604800;
		const humanDuration = humanizeDuration(deleteMessageSeconds * 1000, { largest: 2, round: true });

		// Ban the user
		try {
			await interaction.guild.bans.create(user, {
				reason: `${reason} | By: ${interaction.user.tag} (softban)` ,
				deleteMessageSeconds,
			});
		} catch (error) {
			await interaction.editReply({ content: `Failed to ban user: ${error instanceof Error ? error.message : error}` });
			return;
		}

		// Unban the user
		try {
			await interaction.guild.bans.remove(user, `Softban unban by ${interaction.user.tag}`);
		} catch (error) {
			await interaction.editReply({ content: `User banned, but failed to unban: ${error instanceof Error ? error.message : error}` });
			return;
		}

		await interaction.editReply({ content: `${user.tag} has been softbanned. Deleted messages from the last ${humanDuration}.` });
	}
} 