import type { DiscordClient } from "@/registry/DiscordClient";
import {
	ActionRowBuilder,
	ButtonBuilder,
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
import Logger from "@/utils/Logger";
import { v4 as uuidv4 } from "uuid";
import { FeedbackChannels } from "@/mongo/schemas/FeedbackChannel";
import Select from "@/components/Select";
import Buttons from "@/components/practice/views/Buttons";

export default class FeedbackCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("feedback")
				.setDescription("Submit feedback to the teams behind the server")
				.setDMPermission(false)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {

		const feedbackTeams = await FeedbackChannels.find({
			$or: [{
				guildId: interaction.guildId
			}, {
				label: "Bot Developers",
				channelId: process.env.DEV_FEEDBACK_CHANNEL_ID
			}]
		});

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

		const selectCustomId = uuidv4();

		const teamSelect = new Select(
			"team",
			"Select a team to send the feedback to",
			feedbackTeams.map(({ label, id }) => ({
				label: `${label}`,
				value: id
			})),
			1,
			`${selectCustomId}_0`
		);

		const selectInteraction = await modalInteraction.reply({
			content: "Feedback acknowledged. Select a team to send feedback to",
			components: [
				new ActionRowBuilder<Select>().addComponents(teamSelect),
				new Buttons(selectCustomId) as ActionRowBuilder<ButtonBuilder>
			],
			fetchReply: true,
			ephemeral: true
		});

		const response = await teamSelect.waitForResponse(
			`${selectCustomId}_0`,
			selectInteraction,
			interaction,
			true
		);

		if (!response || response === "Timed out" || !response[0]) {
			await interaction.followUp({
				content: "An error occurred",
				ephemeral: false
			})
			return;
		}

		const team = await FeedbackChannels.findById(response[0]);

		if (!team) {
			await interaction.followUp({
				content: "Team not found",
				ephemeral: false
			})
			return;
		}

		const embed = new EmbedBuilder()
			.setTitle(`Feedback Received for ${team.label}`)
			.setDescription(feedback)
			.setColor(Colors.Blue)
			.setAuthor({
				name: interaction.user.tag,
				iconURL: interaction.user.displayAvatarURL()
			});

		const mainGuild = client.guilds.cache.get(process.env.MAIN_GUILD_ID);

		if (!mainGuild) return;

		try {
			Logger.channel(mainGuild, team.channelId, {
				embeds: [embed]
			});

			modalInteraction.editReply({
				content: "Feedback sent!",
				components: []
			});

		} catch (error) {
			interaction.editReply({
				content:
					"Encountered error while trying to send feedback. Please try again later."
			});

			// client.log(
			// 	error,
			// 	`${this.data.name} Command - Send Feedback`,
			// 	`**Channel:** <#${interaction.channel?.id}>
			// 				**User:** <@${interaction.user.id}>
			// 				**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`
			// );
		}

	}
}
