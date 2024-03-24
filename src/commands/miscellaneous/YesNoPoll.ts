import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
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
						.setRequired(true)
				)
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		if (!interaction.channel) return;

		const poll = interaction.options.getString("poll", true);

		const embed = new EmbedBuilder()
			.setTitle(poll)
			.setDescription("Total Votes: 0\n\nNo one has voted")
			.setAuthor({
				name: interaction.user.tag,
				iconURL: interaction.user.displayAvatarURL()
			})
			.setFooter({ text: `(from: ${interaction.user.username})` });

		try {
			const message = await interaction.channel.send({
				embeds: [embed]
			});

			await message.react("✅");
			await message.react("❌");

			await interaction.reply({
				content: "Poll created successfully",
				ephemeral: true
			});
		} catch (e) {
			await interaction.reply({
				content: "Failed to create poll",
				ephemeral: true
			});

			Logger.error(e);
		}
	}
}
