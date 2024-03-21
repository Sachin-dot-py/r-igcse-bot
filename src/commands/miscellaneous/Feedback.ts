import {
	ActionRowBuilder,
	Colors,
	EmbedBuilder,
	ModalBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle
} from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";

export default class FeedbackCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("feedback")
				.setDescription(
					"Submit feedback to the teams behind the server"
				)
				.addStringOption((option) =>
					option
						.setName("team")
						.setDescription("To whomst u have feedback for")
						.setChoices(
							{
								name: "Moderators",
								value: "mods"
							},
							{
								name: "Bot Developers",
								value: "devs"
							},
							{
								name: "Resource Repository Team",
								value: "resource"
							}
						)
						.setRequired(true)
				)
				.setDMPermission(false)
				.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		if (interaction.guildId !== process.env.MAIN_GUILD_ID) {
			await interaction.reply({
				content: "Feature not yet implemented for your server.",
				ephemeral: true
			});

			return;
		}

		const team = interaction.options.getString("team", true);

		const feedbackInput = new TextInputBuilder()
			.setCustomId("feedback-input")
			.setLabel("Your feedback")
			.setPlaceholder("The message you would like to send")
			.setRequired(true)
			.setStyle(TextInputStyle.Paragraph);

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			feedbackInput
		);

		const modal = new ModalBuilder()
			.setCustomId("feedback-modal")
			.addComponents(row)
			.setTitle("Feedback!");

		await interaction.showModal(modal);

		const modalInteraction = await interaction.awaitModalSubmit({
			time: 180000,
			filter: (i) =>
				i.user.id === interaction.user.id &&
				i.customId === "feedback-modal"
		});

		await modalInteraction.deferUpdate();

		const feedback =
			modalInteraction.fields.getTextInputValue("feedback-input");

		const channel = interaction.guild.channels.cache.get(
			team === "dev"
				? process.env.DEV_FEEDBACK_CHANNEL_ID
				: process.env.MOD_FEEDBACK_CHANNEL_ID
		);

		if (!channel) {
			await interaction.reply(
				`Unable to fetch ${team}-feedback channel. Try again later.`
			);

			return;
		}

		if (!channel.isTextBased()) {
			await interaction.reply(
				"Feedback channel not configured correctly. Must be a text channel."
			);

			return;
		}

		const embed = new EmbedBuilder()
			.setTitle(`bois we got some ${team} feedback`)
			.setDescription(feedback)
			.setColor(Colors.Blue)
			.setAuthor({
				name: interaction.user.tag,
				iconURL: interaction.user.displayAvatarURL()
			});

		await channel.send({
			embeds: [embed]
		});

		await interaction.reply({
			content: "Feedback sent!",
			ephemeral: true
		});
	}
}
