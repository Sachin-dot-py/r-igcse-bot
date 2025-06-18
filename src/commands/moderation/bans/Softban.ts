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
		await interaction.deferReply({ ephemeral: true });

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

		// TODO: Implement softban logic
		await interaction.reply({
			content: "Softban command not yet implemented",
			ephemeral: true,
		});
	}
} 