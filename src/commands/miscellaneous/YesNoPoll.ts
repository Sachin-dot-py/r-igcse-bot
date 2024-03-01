import { logger } from "@/index";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

export default class YesNoPollCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("yes_no_poll")
				.setDescription("Create a new in-channel poll")
				.addStringOption((option) =>
					option
						.setName("poll")
						.setDescription("The poll to be created")
						.setRequired(true),
				),
		);
	}

	async execute(
		interaction: DiscordChatInputCommandInteraction,
		client: DiscordClient,
	) {
		const poll = interaction.options.getString("poll", true);

		const embed = new EmbedBuilder()
			.setTitle(poll)
			.setDescription("Total Votes: 0\n\nNo one has voted")
			.setAuthor({
				name: interaction.user.displayName,
				iconURL: interaction.user.displayAvatarURL(),
			});

		try {
			const message = await interaction.channel?.send({
				embeds: [embed],
			});

			await message?.react("✅");
			await message?.react("❌");
		} catch (e) {
			// TODO: Extract into logger
			await interaction.reply({
				content: "Failed to create poll",
				ephemeral: true,
			});
			logger.error(e);
		}
	}
}
