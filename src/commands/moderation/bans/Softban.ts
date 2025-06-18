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
		// TODO: Implement softban logic
		await interaction.reply({
			content: "Softban command not yet implemented",
			ephemeral: true,
		});
	}
} 