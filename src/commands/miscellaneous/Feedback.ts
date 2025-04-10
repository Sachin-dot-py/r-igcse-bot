import Select from "@/components/Select";
import Buttons from "@/components/practice/views/Buttons";
import { FeedbackChannels } from "@/mongo/schemas/FeedbackChannel";
import type { DiscordClient } from "@/registry/DiscordClient";
import {
	ActionRowBuilder,
	type ButtonBuilder,
	Colors,
	EmbedBuilder,
	ModalBuilder,
	SlashCommandBuilder,
	StringSelectMenuOptionBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { v4 as uuidv4 } from "uuid";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "../../registry/Structure/BaseCommand";

export default class FeedbackCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("feedback")
				.setDescription(
					"Submit feedback to the teams behind the server",
				)
				.setDMPermission(false),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">,
	) {
		const feedbackTeams = [
			{
				guildId: process.env.MAIN_GUILD_ID,
				label: "Bot Developers",
				channelId: process.env.DEV_FEEDBACK_CHANNEL_ID,
			},
			...(
				await FeedbackChannels.find({
					guildId: interaction.guildId,
				})
			).map((doc) => ({
				guildId: doc.guildId,
				label: doc.label,
				channelId: doc.channelId,
			})),
		];

		const feedbackInput = new TextInputBuilder()
			.setCustomId("feedback_input")
			.setLabel("Feedback")
			.setPlaceholder("The feedback you would like to send")
			.setRequired(true)
			.setStyle(TextInputStyle.Paragraph);

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			feedbackInput,
		);

		const modalCustomId = uuidv4();

		const modal = new ModalBuilder()
			.setCustomId(modalCustomId)
			.addComponents(row)
			.setTitle("Feedback!");

		await interaction.showModal(modal);

		const modalInteraction = await interaction.awaitModalSubmit({
			time: 600_000,
			filter: (i) => i.customId === modalCustomId,
		});

		const feedback =
			modalInteraction.fields.getTextInputValue("feedback_input");

		const selectCustomId = uuidv4();

		const teamSelect = new Select(
			"team",
			"Select a team to send the feedback to",
			feedbackTeams.map(({ label }) =>
				new StringSelectMenuOptionBuilder()
					.setLabel(label)
					.setValue(label),
			),
			1,
			`${selectCustomId}_0`,
		);

		const selectInteraction = await modalInteraction.reply({
			content: "Feedback acknowledged. Select a team to send feedback to",
			components: [
				new ActionRowBuilder<Select>().addComponents(teamSelect),
				new Buttons(selectCustomId) as ActionRowBuilder<ButtonBuilder>,
			],
			fetchReply: true,
			ephemeral: true,
		});

		const response = await teamSelect.waitForResponse(
			`${selectCustomId}_0`,
			selectInteraction,
			interaction,
			true,
		);

		if (!response || response === "Timed out" || !response[0]) {
			await interaction.followUp({
				content: "An error occurred",
				ephemeral: false,
			});
			return;
		}

		const team = feedbackTeams.find((doc) => doc.label === response[0]);

		const feedbackGuild = client.guilds.cache.get(interaction.guildId);

		if (!feedbackGuild || !team) return;

		const messageGuild = client.guilds.cache.get(team.guildId);

		if (!messageGuild) return;

		let embed: EmbedBuilder;

		if (team?.label === "Bot Developers") {
			embed = new EmbedBuilder()
				.setTitle("Bot Feedback Received")
				.setDescription(feedback)
				.setFooter({
					text: `from ${feedbackGuild.name} (${feedbackGuild.id})`,
				})
				.setColor(Colors.Blue)
				.setAuthor({
					name: interaction.user.tag,
					iconURL: interaction.user.displayAvatarURL(),
				});
		} else {
			embed = new EmbedBuilder()
				.setTitle(`Feedback received for ${team.label}`)
				.setDescription(feedback)
				.setColor(Colors.Blue)
				.setAuthor({
					name: interaction.user.tag,
					iconURL: interaction.user.displayAvatarURL(),
				});
		}

		try {
			const channel = messageGuild.channels.cache.get(team.channelId);
			if (!channel || !(channel instanceof TextChannel)) {
				await interaction.followUp({
					content: "An error occurred. Channel not found.",
					ephemeral: true,
				});
				return;
			}

			const message = await channel.send({ embeds: [embed] });

			const thread = await message.startThread({
				name: `Feedback from ${interaction.user.username}`,
				autoArchiveDuration: 60,
			});

			const pollEmbed = new EmbedBuilder()
				.setTitle("Feedback Poll")
				.setDescription(
					"Please cast your vote on the feedback submitted.",
				)
				.setColor(Colors.Blurple);

			const pollMessage = await thread.send({ embeds: [pollEmbed] });

			await pollMessage.react("✅");
			await pollMessage.react("❌");

			await modalInteraction.editReply({
				content: "Feedback sent!",
				components: [],
			});
		} catch (error) {
			console.error(error);
			await interaction.editReply({
				content:
					"Encountered error while trying to send feedback. Please try again later.",
				components: [],
			});
		}
	}
}
