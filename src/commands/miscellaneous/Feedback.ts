import type { DiscordClient } from "@/registry/DiscordClient";
import {
	ActionRowBuilder,
	Colors,
	EmbedBuilder,
	ModalBuilder,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import { GuildPreferencesCache } from "@/redis";
import Logger from "@/utils/Logger";
import { v4 as uuidv4 } from "uuid";

export default class FeedbackCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("feedback")
				.setDescription("Send feedback to the server moderators")
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		const guildPreferences = await GuildPreferencesCache.get(
			interaction.guildId
		);

		if (!guildPreferences || !guildPreferences.feedbackChannelId) {
			await interaction.reply({
				content:
					"Please setup the bot using the command `/setup` first.",
				ephemeral: true
			});

			return;
		}

		const feedbackInput = new TextInputBuilder()
			.setCustomId("feedback-input")
			.setLabel("Feedback")
			.setPlaceholder("The feedback you would like to send")
			.setRequired(true)
			.setStyle(TextInputStyle.Paragraph);

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			feedbackInput
		);

		const modalCustomId = uuidv4();

		const modal = new ModalBuilder()
			.setCustomId(modalCustomId)
			.addComponents(row)
			.setTitle("Feedback!");

		await interaction.showModal(modal);

		const modalInteraction = await interaction.awaitModalSubmit({
			time: 600_000,
			filter: (i) => i.customId === modalCustomId
		});

		const feedback =
			modalInteraction.fields.getTextInputValue("feedback-input");

		const embed = new EmbedBuilder()
			.setTitle(`bois we got some feedback`)
			.setDescription(feedback)
			.setColor(Colors.Blue)
			.setAuthor({
				name: interaction.user.tag,
				iconURL: interaction.user.displayAvatarURL()
			});

		Logger.channel(interaction.guild, guildPreferences.feedbackChannelId, {
			embeds: [embed]
		});

		await modalInteraction.reply({
			content: "Feedback sent!",
			ephemeral: true
		});
	}
}
